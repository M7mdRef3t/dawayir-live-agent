// ═══════════════════════════════════════════════════════
// HTTP API Routes
// All Express routes extracted from index.js.
// ═══════════════════════════════════════════════════════
import { Router } from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import { isValidReportFilename } from '../report-filename.js';
import {
    getEmptyUserArtifacts,
    readCognitiveArtifacts,
    writeCognitiveArtifacts,
    resolveUserKey,
    getUserArtifacts,
    summarizeAnalytics,
} from '../services/cognitive-artifacts.js';
import { createApiTokenMiddleware } from '../domains/auth/index.js';
import { sendError } from '../domains/platform/index.js';

/**
 * Creates an Express Router with all API routes.
 * @param {{ storage, BUCKET_NAME, LOCAL_REPORTS_DIR, LOCAL_COGNITIVE_ARTIFACTS_PATH, logError }} deps
 */
export function createApiRouter(deps) {
    const {
        storage,
        BUCKET_NAME,
        LOCAL_REPORTS_DIR,
        LOCAL_COGNITIVE_ARTIFACTS_PATH,
        onTruthContractCreated,
        logError,
    } = deps;

    const router = Router();
    const ensureApiToken = createApiTokenMiddleware();
    const fail = (req, res, status, code, message, details) => (
        sendError(req, res, { status, code, message, details })
    );

    // ── TTS ──────────────────────────────────────────────
    const EDGE_TTS_PATH = process.env.EDGE_TTS_PATH || path.join(
        process.env.APPDATA || '',
        'Python',
        'Python313',
        'Scripts',
        'edge-tts.exe'
    );

    const SYNTHETIC_USER_VOICES = {
        ar: {
            synthetic_user_male: 'ar-EG-ShakirNeural',
            synthetic_user_female: 'ar-EG-SalmaNeural',
            default: 'ar-EG-ShakirNeural',
        },
        en: {
            synthetic_user_male: 'en-US-GuyNeural',
            synthetic_user_female: 'en-US-JennyNeural',
            default: 'en-US-GuyNeural',
        },
    };

    const clampProsodyValue = (value, fallback, pattern) => (
        typeof value === 'string' && pattern.test(value.trim())
            ? value.trim()
            : fallback
    );

    const resolveSyntheticVoice = (lang = 'ar', speaker = 'synthetic_user_male') => {
        const family = SYNTHETIC_USER_VOICES[lang] || SYNTHETIC_USER_VOICES.ar;
        return family[speaker] || family.default;
    };

    const runEdgeTts = ({ text, voice, rate, pitch, volume, outputPath }) => (
        new Promise((resolve, reject) => {
            const args = [
                '--voice', voice,
                '--text', text,
                '--rate', rate,
                '--pitch', pitch,
                '--volume', volume,
                '--write-media', outputPath,
            ];
            const child = spawn(EDGE_TTS_PATH, args, { windowsHide: true });
            let stderr = '';

            child.stderr.on('data', (chunk) => {
                stderr += chunk.toString();
            });
            child.on('error', reject);
            child.on('close', (code) => {
                if (code === 0) {
                    resolve();
                    return;
                }
                reject(new Error(stderr.trim() || `edge-tts exited with code ${code}`));
            });
        })
    );

    const runEdgeTtsWithRetry = async (options, maxAttempts = 3) => {
        let lastError = null;
        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            try {
                await runEdgeTts(options);
                return;
            } catch (error) {
                lastError = error;
                if (!/NoAudioReceived/i.test(String(error?.message || '')) || attempt === maxAttempts) {
                    break;
                }
                await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
            }
        }
        throw lastError;
    };

    router.post('/api/tts', ensureApiToken, async (req, res) => {
        const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
        const lang = req.body?.lang === 'en' ? 'en' : 'ar';
        const speaker = typeof req.body?.speaker === 'string' ? req.body.speaker : 'synthetic_user_male';

        if (!text) {
            return fail(req, res, 400, 'validation_error', 'TTS text is required.');
        }

        if (!fs.existsSync(EDGE_TTS_PATH)) {
            return fail(req, res, 503, 'dependency_unavailable', 'edge-tts is not installed on this machine.');
        }

        const rate = clampProsodyValue(req.body?.rate, '+0%', /^[+-]?\d+%$/);
        const pitch = clampProsodyValue(req.body?.pitch, '+0Hz', /^[+-]?\d+Hz$/i);
        const volume = clampProsodyValue(req.body?.volume, '+0%', /^[+-]?\d+%$/);
        const voice = resolveSyntheticVoice(lang, speaker);
        const outputPath = path.join(
            os.tmpdir(),
            `dawayir-tts-${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`
        );

        try {
            await runEdgeTtsWithRetry({ text, voice, rate, pitch, volume, outputPath });
            const audioBuffer = await fs.promises.readFile(outputPath);
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Cache-Control', 'no-store');
            return res.send(audioBuffer);
        } catch (error) {
            logError(`TTS generation failed for voice=${voice} lang=${lang}:`, error);
            return fail(req, res, 500, 'tts_failed', 'TTS generation failed.');
        } finally {
            try {
                await fs.promises.unlink(outputPath);
            } catch {
                // Ignore temp cleanup errors.
            }
        }
    });

    // ── Reports ──────────────────────────────────────────
    const getLocalReports = () => {
        try {
            if (!fs.existsSync(LOCAL_REPORTS_DIR)) return [];
            const files = fs.readdirSync(LOCAL_REPORTS_DIR);
            return files.filter(f => f.startsWith('session_report_')).map(f => {
                const stats = fs.statSync(path.join(LOCAL_REPORTS_DIR, f));
                return {
                    name: f,
                    updated: stats.mtime.toISOString(),
                    size: stats.size,
                    source: 'local'
                };
            });
        } catch (err) {
            console.error('Error reading local reports:', err);
            return [];
        }
    };

    router.get('/api/reports', ensureApiToken, async (req, res) => {
        try {
            const localReports = getLocalReports();
            let gcsReports = [];

            if (BUCKET_NAME) {
                try {
                    const [files] = await storage.bucket(BUCKET_NAME).getFiles({ prefix: 'session_report_' });
                    gcsReports = files.map(file => ({
                        name: file.name,
                        updated: file.metadata.updated,
                        size: file.metadata.size,
                        source: 'cloud'
                    }));
                } catch (gcsErr) {
                    console.warn('GCS reports fetch failed, using local only');
                }
            }

            const allReports = [...localReports, ...gcsReports]
                .filter((v, i, a) => a.findIndex(t => t.name === v.name) === i)
                .sort((a, b) => new Date(b.updated) - new Date(a.updated));

            res.json(allReports);
        } catch (error) {
            console.error('Error listing reports:', error);
            return fail(req, res, 500, 'reports_list_failed', error.message);
        }
    });

    router.get('/api/reports/:filename', ensureApiToken, async (req, res) => {
        const { filename } = req.params;
        if (!isValidReportFilename(filename)) {
            return fail(req, res, 400, 'validation_error', 'Invalid filename format');
        }

        const localPath = path.join(LOCAL_REPORTS_DIR, filename);
        if (fs.existsSync(localPath)) {
            try {
                const content = fs.readFileSync(localPath, 'utf8');
                return res.send(content);
            } catch (err) {
                console.error('Error reading local file:', err);
            }
        }

        try {
            if (!BUCKET_NAME) throw new Error('Local file not found and GCS not configured');
            const file = storage.bucket(BUCKET_NAME).file(filename);
            const [content] = await file.download();
            res.send(content.toString());
        } catch (error) {
            console.error('Error fetching report:', error);
            return fail(req, res, 404, 'report_not_found', 'Report not found');
        }
    });

    router.delete('/api/reports/:filename', ensureApiToken, async (req, res) => {
        const { filename } = req.params;
        if (!isValidReportFilename(filename)) {
            return fail(req, res, 400, 'validation_error', 'Invalid filename format');
        }

        const localPath = path.join(LOCAL_REPORTS_DIR, filename);
        let deleted = false;

        if (fs.existsSync(localPath)) {
            try {
                fs.unlinkSync(localPath);
                deleted = true;
            } catch (err) {
                console.error('Error deleting local file:', err);
            }
        }

        if (BUCKET_NAME) {
            try {
                const file = storage.bucket(BUCKET_NAME).file(filename);
                const [exists] = await file.exists();
                if (exists) {
                    await file.delete();
                    deleted = true;
                }
            } catch (error) {
                console.error('Error deleting from GCS:', error);
            }
        }

        if (deleted) {
            return res.json({ success: true, message: 'Artifact scattered (sand mandala)' });
        } else {
            return fail(req, res, 404, 'report_not_found', 'Report not found');
        }
    });

    // ── Cognitive Artifacts ──────────────────────────────
    router.get('/api/cognitive-artifacts', ensureApiToken, (req, res) => {
        try {
            const userKey = resolveUserKey(req);
            const allData = readCognitiveArtifacts(LOCAL_COGNITIVE_ARTIFACTS_PATH);
            const userData = getUserArtifacts(allData, userKey);
            return res.json({ ok: true, data: userData, userKey });
        } catch (error) {
            return fail(req, res, 500, 'cognitive_artifacts_read_failed', error.message);
        }
    });

    router.post('/api/cognitive-artifacts', ensureApiToken, (req, res) => {
        try {
            const userKey = resolveUserKey(req);
            const { progressEntry, truthContract, moment, reminder } = req.body || {};
            const current = readCognitiveArtifacts(LOCAL_COGNITIVE_ARTIFACTS_PATH);
            const next = { ...current, users: { ...(current.users || {}) } };
            const userData = { ...getUserArtifacts(next, userKey) };

            if (progressEntry && Array.isArray(progressEntry?.circles)) {
                userData.progressHistory = [
                    ...(userData.progressHistory || []),
                    {
                        date: progressEntry.date || new Date().toISOString(),
                        circles: progressEntry.circles.slice(0, 3).map((c) => ({
                            id: Number(c.id),
                            radius: Number(c.radius) || 50,
                            label: String(c.label || ''),
                        })),
                    },
                ];
            }

            if (truthContract?.action) {
                const createdTruthContract = {
                    title: String(truthContract.title || ''),
                    action: String(truthContract.action || ''),
                    anchor: String(truthContract.anchor || ''),
                    createdAt: truthContract.createdAt || new Date().toISOString(),
                };
                userData.truthContracts = [
                    ...(userData.truthContracts || []),
                    createdTruthContract,
                ];
                if (typeof onTruthContractCreated === 'function') {
                    onTruthContractCreated({ userKey, truthContract: createdTruthContract });
                }
            }

            if (moment?.reason) {
                userData.moments = [
                    ...(userData.moments || []),
                    {
                        at: String(moment.at || ''),
                        reason: String(moment.reason || ''),
                        clarity: Number(moment.clarity) || 0,
                        createdAt: moment.createdAt || new Date().toISOString(),
                    },
                ];
            }

            if (reminder?.action && reminder?.dueAt) {
                userData.reminders = [
                    ...(userData.reminders || []).filter((r) => String(r.action || '') !== String(reminder.action || '')),
                    {
                        action: String(reminder.action || ''),
                        dueAt: Number(reminder.dueAt) || Date.now(),
                        createdAt: Number(reminder.createdAt) || Date.now(),
                    },
                ];
            }

            next.users[userKey] = userData;
            const saved = writeCognitiveArtifacts(LOCAL_COGNITIVE_ARTIFACTS_PATH, next);
            return res.json({ ok: true, data: saved.users?.[userKey] || getEmptyUserArtifacts(), userKey });
        } catch (error) {
            return fail(req, res, 500, 'cognitive_artifacts_write_failed', error.message);
        }
    });

    router.post('/api/cognitive-artifacts/truth-contract-complete', ensureApiToken, (req, res) => {
        try {
            const userKey = resolveUserKey(req);
            const action = String(req.body?.action || '').trim();
            if (!action) {
                return fail(req, res, 400, 'validation_error', 'action is required');
            }
            const current = readCognitiveArtifacts(LOCAL_COGNITIVE_ARTIFACTS_PATH);
            const next = { ...current, users: { ...(current.users || {}) } };
            const userData = { ...getUserArtifacts(next, userKey) };
            const nowIso = new Date().toISOString();

            userData.truthContracts = (userData.truthContracts || []).map((entry) => (
                String(entry?.action || '').trim() === action
                    ? { ...entry, completedAt: nowIso }
                    : entry
            ));
            userData.reminders = (userData.reminders || []).filter((entry) => String(entry?.action || '').trim() !== action);
            userData.analyticsEvents = [
                ...(userData.analyticsEvents || []),
                { type: 'truth_contract_done', action, at: nowIso },
            ];
            next.users[userKey] = userData;

            const saved = writeCognitiveArtifacts(LOCAL_COGNITIVE_ARTIFACTS_PATH, next);
            return res.json({ ok: true, data: saved.users?.[userKey] || getEmptyUserArtifacts(), userKey });
        } catch (error) {
            return fail(req, res, 500, 'truth_contract_complete_failed', error.message);
        }
    });

    router.get('/api/cognitive-artifacts/truth-contract/latest', ensureApiToken, (req, res) => {
        try {
            const userKey = resolveUserKey(req);
            const allData = readCognitiveArtifacts(LOCAL_COGNITIVE_ARTIFACTS_PATH);
            const userData = getUserArtifacts(allData, userKey);
            const truthContracts = Array.isArray(userData.truthContracts) ? userData.truthContracts : [];
            const sorted = [...truthContracts].sort((a, b) => (
                new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime()
            ));
            const latest = sorted[0] || null;

            if (!latest) {
                return res.json({ ok: true, userKey, truthContract: null });
            }

            const status = latest.completedAt ? 'completed' : 'pending';
            return res.json({
                ok: true,
                userKey,
                truthContract: {
                    ...latest,
                    status,
                },
            });
        } catch (error) {
            return fail(req, res, 500, 'truth_contract_latest_failed', error.message);
        }
    });

    router.post('/api/cognitive-artifacts/migrate', ensureApiToken, (req, res) => {
        try {
            const userKey = resolveUserKey(req);
            const {
                legacyProgress = [],
                legacyReminder = null,
            } = req.body || {};
            const current = readCognitiveArtifacts(LOCAL_COGNITIVE_ARTIFACTS_PATH);
            const next = { ...current, users: { ...(current.users || {}) } };
            const userData = { ...getUserArtifacts(next, userKey) };
            if (Array.isArray(legacyProgress) && legacyProgress.length > 0) {
                userData.progressHistory = [
                    ...(userData.progressHistory || []),
                    ...legacyProgress.slice(-120).map((entry) => ({
                        date: entry?.date || new Date().toISOString(),
                        circles: Array.isArray(entry?.circles) ? entry.circles.slice(0, 3).map((c) => ({
                            id: Number(c.id),
                            radius: Number(c.radius) || 50,
                            label: String(c.label || ''),
                        })) : [],
                    })),
                ];
            }
            if (legacyReminder?.action && legacyReminder?.dueAt) {
                userData.reminders = [
                    ...(userData.reminders || []).filter((r) => String(r.action || '') !== String(legacyReminder.action || '')),
                    {
                        action: String(legacyReminder.action),
                        dueAt: Number(legacyReminder.dueAt),
                        createdAt: Number(legacyReminder.createdAt || Date.now()),
                    },
                ];
            }
            next.users[userKey] = userData;
            const saved = writeCognitiveArtifacts(LOCAL_COGNITIVE_ARTIFACTS_PATH, next);
            return res.json({ ok: true, data: saved.users?.[userKey] || getEmptyUserArtifacts(), userKey });
        } catch (error) {
            return fail(req, res, 500, 'cognitive_artifacts_migrate_failed', error.message);
        }
    });

    // ── Analytics ────────────────────────────────────────
    router.post('/api/analytics/event', ensureApiToken, (req, res) => {
        try {
            const userKey = resolveUserKey(req);
            const type = String(req.body?.type || '').trim();
            if (!type) {
                return fail(req, res, 400, 'validation_error', 'type is required');
            }
            const current = readCognitiveArtifacts(LOCAL_COGNITIVE_ARTIFACTS_PATH);
            const next = { ...current, users: { ...(current.users || {}) } };
            const userData = { ...getUserArtifacts(next, userKey) };
            userData.analyticsEvents = [
                ...(userData.analyticsEvents || []),
                {
                    type,
                    at: new Date().toISOString(),
                    payload: req.body?.payload && typeof req.body.payload === 'object' ? req.body.payload : {},
                },
            ];
            next.users[userKey] = userData;
            writeCognitiveArtifacts(LOCAL_COGNITIVE_ARTIFACTS_PATH, next);
            return res.json({ ok: true });
        } catch (error) {
            return fail(req, res, 500, 'analytics_event_write_failed', error.message);
        }
    });

    router.get('/api/analytics/summary', ensureApiToken, (req, res) => {
        try {
            const userKey = resolveUserKey(req);
            const allData = readCognitiveArtifacts(LOCAL_COGNITIVE_ARTIFACTS_PATH);
            const userData = getUserArtifacts(allData, userKey);
            const summary = summarizeAnalytics(userData);
            return res.json({ ok: true, summary, userKey });
        } catch (error) {
            return fail(req, res, 500, 'analytics_summary_failed', error.message);
        }
    });

    return router;
}
