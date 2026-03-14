// ═══════════════════════════════════════════════════════
// Cognitive Artifacts – Data Layer
// CRUD operations for the multi-user artifacts store.
// ═══════════════════════════════════════════════════════
import fs from 'fs';
import crypto from 'crypto';

const buildEncryptionKey = () => {
    const raw = process.env.DWR_ARTIFACTS_ENCRYPTION_KEY || '';
    if (!raw) return null;
    return crypto.createHash('sha256').update(raw, 'utf8').digest();
};

const ENCRYPTION_KEY = buildEncryptionKey();
const RETENTION_DAYS = Number(process.env.DWR_RETENTION_DAYS || 180);

const toMillis = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Date.parse(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return null;
};

const encryptPayload = (payload) => {
    if (!ENCRYPTION_KEY) return payload;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    const plaintext = JSON.stringify(payload);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
        enc: {
            alg: 'aes-256-gcm',
            iv: iv.toString('base64'),
            tag: tag.toString('base64'),
            data: ciphertext.toString('base64'),
        },
        updatedAt: new Date().toISOString(),
    };
};

const decryptPayloadIfNeeded = (parsed) => {
    if (!parsed?.enc) return parsed;
    if (!ENCRYPTION_KEY) {
        throw new Error('Encrypted artifacts detected but DWR_ARTIFACTS_ENCRYPTION_KEY is not set');
    }
    const iv = Buffer.from(String(parsed.enc.iv || ''), 'base64');
    const tag = Buffer.from(String(parsed.enc.tag || ''), 'base64');
    const data = Buffer.from(String(parsed.enc.data || ''), 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
    return JSON.parse(plaintext);
};

const pruneByRetention = (entries = [], dateResolver) => {
    if (!Array.isArray(entries)) return [];
    const cutoff = Date.now() - (Math.max(1, RETENTION_DAYS) * 24 * 60 * 60 * 1000);
    return entries.filter((entry) => {
        const when = toMillis(dateResolver(entry));
        return when === null || when >= cutoff;
    });
};

export const getEmptyUserArtifacts = () => ({
    progressHistory: [],
    truthContracts: [],
    moments: [],
    reminders: [],
    analyticsEvents: [],
});

export const readCognitiveArtifacts = (filePath) => {
    try {
        if (!fs.existsSync(filePath)) {
            return { users: {}, updatedAt: new Date().toISOString() };
        }
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = decryptPayloadIfNeeded(JSON.parse(raw));
        if (parsed?.users && typeof parsed.users === 'object') {
            return parsed;
        }
        // Migration path from legacy single-user schema.
        const migrated = {
            users: {
                anonymous: {
                    progressHistory: Array.isArray(parsed?.progressHistory) ? parsed.progressHistory : [],
                    truthContracts: Array.isArray(parsed?.truthContracts) ? parsed.truthContracts : [],
                    moments: Array.isArray(parsed?.moments) ? parsed.moments : [],
                    reminders: Array.isArray(parsed?.reminders) ? parsed.reminders : [],
                    analyticsEvents: [],
                },
            },
            updatedAt: new Date().toISOString(),
        };
        return migrated;
    } catch (err) {
        console.error('Error reading cognitive artifacts:', err);
        return { users: {}, updatedAt: new Date().toISOString() };
    }
};

export const writeCognitiveArtifacts = (filePath, nextData) => {
    const users = {};
    const sourceUsers = (nextData?.users && typeof nextData.users === 'object') ? nextData.users : {};
    for (const [userKey, userData] of Object.entries(sourceUsers)) {
        users[userKey] = {
            progressHistory: pruneByRetention(
                Array.isArray(userData?.progressHistory) ? userData.progressHistory.slice(-120) : [],
                (entry) => entry?.date
            ),
            truthContracts: pruneByRetention(
                Array.isArray(userData?.truthContracts) ? userData.truthContracts.slice(-200) : [],
                (entry) => entry?.createdAt || entry?.completedAt
            ),
            moments: pruneByRetention(
                Array.isArray(userData?.moments) ? userData.moments.slice(-200) : [],
                (entry) => entry?.createdAt || entry?.at
            ),
            reminders: pruneByRetention(
                Array.isArray(userData?.reminders) ? userData.reminders.slice(-200) : [],
                (entry) => entry?.createdAt || entry?.dueAt
            ),
            analyticsEvents: pruneByRetention(
                Array.isArray(userData?.analyticsEvents) ? userData.analyticsEvents.slice(-500) : [],
                (entry) => entry?.at
            ),
        };
    }
    const payload = {
        users,
        updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(filePath, JSON.stringify(encryptPayload(payload), null, 2), 'utf8');
    return payload;
};

export const resolveUserKey = (req) => {
    const apiToken = String(process.env.DWR_API_TOKEN || '').trim();
    const authHeader = String(req.headers?.['x-dawayir-auth'] || '').trim();
    if (apiToken && authHeader && authHeader === apiToken) {
        const digest = crypto.createHash('sha256').update(authHeader, 'utf8').digest('hex');
        return `auth_${digest.slice(0, 24)}`;
    }
    const fromQuery = typeof req.query?.userKey === 'string' ? req.query.userKey : '';
    const fromHeader = typeof req.headers?.['x-dawayir-user'] === 'string' ? req.headers['x-dawayir-user'] : '';
    const fromBody = typeof req.body?.userKey === 'string' ? req.body.userKey : '';
    const candidate = (fromQuery || fromHeader || fromBody || 'anonymous').trim();
    return candidate.slice(0, 120);
};

export const getUserArtifacts = (container, userKey) => {
    if (!container.users) container.users = {};
    if (!container.users[userKey]) container.users[userKey] = getEmptyUserArtifacts();
    return container.users[userKey];
};

export const summarizeAnalytics = (userArtifacts = {}) => {
    const events = Array.isArray(userArtifacts.analyticsEvents) ? userArtifacts.analyticsEvents : [];
    const truthDone = events.filter((event) => event?.type === 'truth_contract_done').length;
    const truthSnooze = events.filter((event) => event?.type === 'truth_contract_snooze').length;
    const moments = Array.isArray(userArtifacts.moments) ? userArtifacts.moments.length : 0;
    const sessions = Array.isArray(userArtifacts.progressHistory) ? userArtifacts.progressHistory.length : 0;
    const completionRate = (truthDone + truthSnooze) > 0
        ? Math.round((truthDone / (truthDone + truthSnooze)) * 100)
        : 0;
    const progressHistory = Array.isArray(userArtifacts.progressHistory) ? userArtifacts.progressHistory : [];
    const sortedProgress = [...progressHistory]
        .sort((a, b) => new Date(a?.date || 0).getTime() - new Date(b?.date || 0).getTime());
    const trendRaw = [];
    for (let i = Math.max(1, sortedProgress.length - 7); i < sortedProgress.length; i += 1) {
        const prev = sortedProgress[i - 1];
        const curr = sortedProgress[i];
        const prevMap = new Map((prev?.circles || []).map((c) => [Number(c.id), Number(c.radius) || 0]));
        const currMap = new Map((curr?.circles || []).map((c) => [Number(c.id), Number(c.radius) || 0]));
        const truthDrop = Math.max(0, (prevMap.get(3) || 0) - (currMap.get(3) || 0));
        const awarenessDrop = Math.max(0, (prevMap.get(1) || 0) - (currMap.get(1) || 0));
        const knowledgeDrop = Math.max(0, (prevMap.get(2) || 0) - (currMap.get(2) || 0));
        const risk = Math.min(100, Math.round((truthDrop * 4) + (awarenessDrop * 2) + (knowledgeDrop * 2)));
        trendRaw.push({
            date: curr?.date || new Date().toISOString(),
            risk,
        });
    }
    const relapseRiskTrend7d = trendRaw.slice(-7);
    const latestRelapseRisk = relapseRiskTrend7d.length > 0 ? relapseRiskTrend7d[relapseRiskTrend7d.length - 1].risk : 0;
    return {
        truthContractCompletionRate: completionRate,
        truthContractDone: truthDone,
        truthContractSnooze: truthSnooze,
        momentsPerSession: sessions > 0 ? Number((moments / sessions).toFixed(2)) : 0,
        sessions,
        relapseRiskTrend7d,
        latestRelapseRisk,
    };
};
