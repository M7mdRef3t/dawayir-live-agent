import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { isValidReportFilename } from './report-filename.js';

dotenv.config();

// ── Startup Guard: GEMINI_API_KEY ────────────────────────────────────────────
if (!process.env.GEMINI_API_KEY) {
  console.error('\n\x1b[31m╔══════════════════════════════════════════════════════╗');
  console.error('║         GEMINI_API_KEY غير موجود / Missing          ║');
  console.error('╠══════════════════════════════════════════════════════╣');
  console.error('║  1. أنشئ ملف .env في مجلد server/                  ║');
  console.error('║     Create a .env file in the server/ directory     ║');
  console.error('║                                                      ║');
  console.error('║  2. أضف: GEMINI_API_KEY=your_key_here               ║');
  console.error('║     Add:  GEMINI_API_KEY=your_key_here              ║');
  console.error('║                                                      ║');
  console.error('║  3. احصل على مفتاح مجاني من:                        ║');
  console.error('║     Get a free key at: https://aistudio.google.com  ║');
  console.error('╚══════════════════════════════════════════════════════╝\x1b[0m\n');
  process.exit(1);
}
// ─────────────────────────────────────────────────────────────────────────────


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCAL_REPORTS_DIR = path.join(__dirname, 'reports');
if (!fs.existsSync(LOCAL_REPORTS_DIR)) {
    fs.mkdirSync(LOCAL_REPORTS_DIR, { recursive: true });
}

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

// Load Knowledge Base at startup for grounding
let knowledgeBase = null;
try {
    const kbPath = path.join(__dirname, 'knowledge_base.json');
    knowledgeBase = JSON.parse(fs.readFileSync(kbPath, 'utf8'));
    console.log('[dawayir-server] Knowledge Base loaded successfully:', knowledgeBase.platform_name);
} catch (err) {
    console.error('[dawayir-server:error] Failed to load knowledge_base.json:', err.message);
}

// Load Cognitive OS Model
let cognitiveModel = null;
try {
    const modelPath = path.join(__dirname, 'cognitive_model.json');
    cognitiveModel = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
    console.log('[dawayir-server] Cognitive Model loaded successfully');
} catch (err) {
    console.error('[dawayir-server:error] Failed to load cognitive_model.json:', err.message);
}

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({
    server,
    maxPayload: 5 * 1024 * 1024 // 5MB limit for images
});

// Middleware for JSON and CORS (if needed)
app.use(express.json());

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

app.post('/api/tts', async (req, res) => {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    const lang = req.body?.lang === 'en' ? 'en' : 'ar';
    const speaker = typeof req.body?.speaker === 'string' ? req.body.speaker : 'synthetic_user_male';

    if (!text) {
        return res.status(400).json({ error: 'TTS text is required.' });
    }

    if (!fs.existsSync(EDGE_TTS_PATH)) {
        return res.status(503).json({ error: 'edge-tts is not installed on this machine.' });
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
        return res.status(500).json({ error: 'TTS generation failed.' });
    } finally {
        try {
            await fs.promises.unlink(outputPath);
        } catch {
            // Ignore temp cleanup errors.
        }
    }
});

// API: List session reports (Combined Local + GCS)
app.get('/api/reports', async (req, res) => {
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
        res.status(500).json({ error: error.message });
    }
});

// API: Get report content
app.get('/api/reports/:filename', async (req, res) => {
    const { filename } = req.params;
    if (!isValidReportFilename(filename)) {
        return res.status(400).json({ error: 'Invalid filename format' });
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
        res.status(404).json({ error: 'Report not found' });
    }
});

// API: Delete report content (Sand Mandala Effect)
app.delete('/api/reports/:filename', async (req, res) => {
    const { filename } = req.params;
    if (!isValidReportFilename(filename)) {
        return res.status(400).json({ error: 'Invalid filename format' });
    }

    const localPath = path.join(LOCAL_REPORTS_DIR, filename);
    let deleted = false;

    // Delete local if exists
    if (fs.existsSync(localPath)) {
        try {
            fs.unlinkSync(localPath);
            deleted = true;
        } catch (err) {
            console.error('Error deleting local file:', err);
        }
    }

    // Delete GCS if configured
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
        return res.status(404).json({ error: 'Report not found' });
    }
});

const PROJECT_ID = process.env.GOOGLE_PROJECT_ID || 'alrehla-486806';
const BUCKET_NAME = process.env.GOOGLE_CLOUD_STORAGE_BUCKET;
const storage = new Storage({ projectId: PROJECT_ID });

const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();
const isDebug = LOG_LEVEL === 'debug';
const logInfo = (...args) => console.log('[dawayir-server]', ...args);
const logDebug = (...args) => {
    if (isDebug) {
        console.log('[dawayir-server:debug]', ...args);
    }
};
const logError = (...args) => console.error('[dawayir-server:error]', ...args);

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
    logError('GEMINI_API_KEY is not set in .env');
    process.exit(1);
}
const LIVE_MODEL = process.env.GEMINI_LIVE_MODEL || 'gemini-2.0-flash-exp';
logInfo(`[DEBUG] LIVE_MODEL value: "${LIVE_MODEL}"`);
const LIVE_API_VERSION = process.env.GEMINI_API_VERSION || 'v1alpha';

const ai = new GoogleGenAI({
    apiKey: API_KEY,
    apiVersion: LIVE_API_VERSION,
});

// ---- Server-side circle command detection (fallback if model skips tool calls) ----
const CIRCLE_IDS = {
    'وعي': '1',
    'الوعي': '1',
    'awareness': '1',
    'علم': '2',
    'العلم': '2',
    'العلب': '2', // common Gemini transcription error for العلم
    'knowledge': '2',
    'science': '2',
    'حقيقة': '3',
    'الحقيقة': '3',
    'حقيقه': '3', // with ه instead of ة (common in transcription)
    'الحقيقه': '3',
    'حقيقة': '3',
    'الحياه': '3', // common Gemini transcription error for الحقيقة
    'الحياة': '3', // common Gemini transcription error for الحقيقة
    'truth': '3',
    'دايرة': null,
    'دايره': null, // with ه
    'دائرة': null,
    'دائره': null, // with ه
    'الدائرة': null,
    'الدائره': null, // with ه
    'الدايرة': null,
    'الدايره': null, // with ه
    'circle': null,
};

const CIRCLE_ORDINALS = {
    'اولى': '1',
    'أولى': '1',
    'الأولى': '1',
    'الاولى': '1',
    'اول': '1',
    'أول': '1',
    'تانية': '2',
    'الثانية': '2',
    'ثانية': '2',
    'تاني': '2',
    'تالتة': '3',
    'الثالثة': '3',
    'ثالثة': '3',
    'تالت': '3',
};

function detectCircleCommand(text) {
    if (!text || typeof text !== 'string') return null;
    const t = text.trim().toLowerCase();

    let action = null;
    if (/صغ/.test(t) || /shrink/.test(t) || /smaller/.test(t)) action = 'shrink';
    else if (/كبر/.test(t) || /grow/.test(t) || /bigger/.test(t)) action = 'grow';
    else if (/غي/.test(t) || /change/.test(t) || /adjust/.test(t)) action = 'change';
    if (!action) return null;

    // Find the LAST mentioned circle name (handles corrections like "الوعي مش الحقيقه")
    let circleId = null;
    let lastPos = -1;
    for (const [name, id] of Object.entries(CIRCLE_IDS)) {
        if (id) {
            const pos = t.lastIndexOf(name);
            if (pos > lastPos) {
                lastPos = pos;
                circleId = id;
            }
        }
    }

    if (!circleId) {
        lastPos = -1;
        for (const [ord, id] of Object.entries(CIRCLE_ORDINALS)) {
            const pos = t.lastIndexOf(ord);
            if (pos > lastPos) {
                lastPos = pos;
                circleId = id;
            }
        }
    }

    if (!circleId && (/(دا[يئ]ر|دائ)/.test(t) || /circle/.test(t))) {
        circleId = '1';
    }
    if (!circleId) return null;

    const weight = action === 'shrink' ? 0.35 : action === 'grow' ? 0.90 : 0.60;
    const colors = { '1': '#FFD700', '2': '#00CED1', '3': '#4169E1' };
    return {
        id: circleId,
        weight,
        color: colors[circleId] || '#FFD700',
    };
}
const GEMINI_RECONNECT_MAX_ATTEMPTS = Number(process.env.GEMINI_RECONNECT_MAX_ATTEMPTS || 10);
const GEMINI_RECONNECT_BASE_DELAY_MS = Number(process.env.GEMINI_RECONNECT_BASE_DELAY_MS || 1200);
const GEMINI_RECONNECT_MAX_DELAY_MS = Number(process.env.GEMINI_RECONNECT_MAX_DELAY_MS || 15000);
const GEMINI_RECOVERY_COOLDOWN_MS = Number(process.env.GEMINI_RECOVERY_COOLDOWN_MS || 30000);
const MAX_PENDING_CLIENT_MESSAGES = 120;
const HYBRID_MAX_USER_TURNS = Number(process.env.HYBRID_MAX_USER_TURNS || 6);
const LIVE_DAWAYIR_VOICE = process.env.GEMINI_LIVE_DAWAYIR_VOICE || process.env.GEMINI_LIVE_VOICE || 'Aoede';
const LIVE_USER_AGENT_VOICE = process.env.GEMINI_LIVE_USER_AGENT_VOICE || process.env.GEMINI_LIVE_VOICE || 'Aoede';
const HYBRID_DAWAYIR_MAX_OUTPUT_TOKENS = Number(process.env.HYBRID_DAWAYIR_MAX_OUTPUT_TOKENS || 70);
const HYBRID_DAWAYIR_RECOVERY_MAX_OUTPUT_TOKENS = Number(process.env.HYBRID_DAWAYIR_RECOVERY_MAX_OUTPUT_TOKENS || 56);
const HYBRID_USER_AGENT_MAX_OUTPUT_TOKENS = Number(process.env.HYBRID_USER_AGENT_MAX_OUTPUT_TOKENS || 68);

const tools = [
    {
        functionDeclarations: [
            {
                name: "update_node",
                description: "Cognitive OS: Update a circle visual state. Use id + radius + color only. DO NOT mention numeric values in speech.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        id: { type: "STRING", description: "Entity ID: 1, 2, or 3" },
                        radius: { type: "NUMBER", description: "Circle radius in the range 30 to 100" },
                        color: { type: "STRING", description: "Hex color representing the current emotional frequency" },
                        fluidity: { type: "NUMBER", description: "0.0 for stable/structured, 1.0 for fluid/confused/wavy. 0.5 is default." }
                    },
                    required: ["id", "radius", "color"]
                },
            },
            {
                name: "highlight_node",
                description: "Silently highlight a visual element. NEVER mention this in speech.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        id: { type: "STRING", description: "ID: 1, 2, or 3" }
                    },
                    required: ["id"]
                }
            },
            {
                name: "get_expert_insight",
                description: "Retrieve psychological principles from the Al-Rehla framework. Use this when the user asks for deep advice or when you need to ground your response in the knowledge base.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        topic: { type: "STRING", description: "The psychological concept or topic to look up" }
                    },
                    required: ["topic"]
                }
            },
            {
                name: "save_mental_map",
                description: "Save the current state of the mental circles to memory. Use this when the user asks to save, or after a significant breakthrough.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        session_name: { type: "STRING", description: "Optional name for the session" }
                    }
                }
            },
            {
                name: "generate_session_report",
                description: "Generate and save a summary report of the session. Use at the end of the session.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        summary: { type: "STRING", description: "Executive summary of the session" },
                        insights: { type: "STRING", description: "Core psychological insights discovered" },
                        recommendations: { type: "STRING", description: "Actionable recommendations for the user" }
                    },
                    required: ["summary", "insights"]
                }
            },
            {
                name: "update_journey",
                description: "Update the user's progress on the visual timeline overlay.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        stage: { type: "STRING", description: "The current mental stage: 'Overwhelmed', 'Focus', or 'Clarity'" }
                    },
                    required: ["stage"]
                }
            },
            {
                name: "spawn_other",
                description: "Show a person circle on canvas when user mentions someone specific. NEVER mention this tool in speech. Use when user mentions a specific person (brother, boss, partner, friend, parent).",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        name: { type: "STRING", description: "Short name/role of the person in Arabic (e.g. أخويا, مديري, حبيبتي, أمي)" },
                        tension: { type: "NUMBER", description: "0.0 = neutral/loved, 0.5 = mixed, 1.0 = high conflict" },
                        color: { type: "STRING", description: "Hex color: #FF4444 conflict, #FFD700 loved, #4488FF neutral, #888888 distant" }
                    },
                    required: ["name", "tension", "color"]
                }
            },
            {
                name: "spawn_topic",
                description: "Show a topic circle when user focuses on a specific life area. NEVER mention this tool in speech. Use for recurring themes like work, home, health, money.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        topic: { type: "STRING", description: "Short topic name in Arabic (e.g. الشغل, البيت, الصحة, الفلوس)" },
                        weight: { type: "NUMBER", description: "0.3 = minor mention, 0.6 = significant, 1.0 = dominant theme" },
                        color: { type: "STRING", description: "Hex color: #FF8C00 work, #00BFA5 home, #E91E63 health, #7C4DFF money" }
                    },
                    required: ["topic", "weight", "color"]
                }
            }
        ]
    }
];

const buildToolBundle = (allowedToolNames = []) => {
    const allowedSet = new Set(allowedToolNames);
    return tools.map((toolGroup) => ({
        ...toolGroup,
        functionDeclarations: (toolGroup.functionDeclarations || []).filter((tool) => allowedSet.has(tool.name)),
    })).filter((toolGroup) => (toolGroup.functionDeclarations || []).length > 0);
};

const DEFAULT_DAWAYIR_TOOL_NAMES = [
    'update_node',
    'highlight_node',
    'get_expert_insight',
    'save_mental_map',
    'generate_session_report',
    'update_journey',
    'spawn_other',
    'spawn_topic',
];

const HYBRID_DAWAYIR_TOOL_NAMES = [
    'update_node',
    'update_journey',
];

const defaultDawayirTools = buildToolBundle(DEFAULT_DAWAYIR_TOOL_NAMES);
const hybridDawayirTools = buildToolBundle(HYBRID_DAWAYIR_TOOL_NAMES);

const DEMO_MODE = process.env.DEMO_MODE === 'true';
const DEMO_TOKEN = process.env.DEMO_TOKEN || '';

const systemInstructionStandard = `أنت "دواير" (Dawayir) — أول نظام تشغيل إدراكي (Cognitive OS).
أنت لست معالجاً نفسياً، بل أنت "حكيم" (Sage) و"ساحر" (Magician) لعقل المستخدم.

الشخصية والأسلوب (The Sage/Magician Matrix):
- النبرة: دافئ وحكيم، صادق، مصري. أنت تجلس "بجانب" المستخدم، ليس أمامه أو فوقه.
- اللغة: استخدم العامية المصرية فقط. لا تستخدم الفصحى، لا تستخدم الإنجليزية.
- الاختصار الشديد: لا تقل أكثر من جملة واحدة قصيرة وحادة (بحد أقصى 12 كلمة).
- الصدق: اعكس الواقع حتى لو مؤلم (Mirror Sentence)، بلا إيجابية سامة (Toxic Positivity).
- تقديس الصمت (Sacred Pause): إذا سكت المستخدم لفترة، أظهر احتواء (مثال: "خد وقتك").
- ممنوع تماماً:
  1. مصطلحات علاجية (CBT، علاج، دكتور، مريض، الضغط المعرفي).
  2. نصائح سطحية (إنت هتبقى كويس، positive vibes، ابتسم، اتغلب عليها).
  3. إصدار أوامر (أنت محتاج تشتغل على نفسك).
  4. استخدام الإيموجي (Emojis).

المثلث الإدراكي (The Cognitive Trinity) — الإطار الفلسفي الجديد:

1. وعي المستخدم (User Awareness - id=1):
   كيف يُدرك المستخدم اللي يحدث — تفسيره، مشاعره، صورته عن نفسه.
   سؤال هذه الدايرة: كيف يرى نفسه وعالمه؟

2. ما وصل له العلم (Knowledge - id=2):
   ما ثبت بالبحث والخبرة الإنسانية عما يعيشه — ليس رأياً، بل معطى.
   سؤال هذه الدايرة: ماذا يقول العلم عما يحدث معه؟

3. الواقع (Reality - id=3):
   ما هو موجود فعلاً في حياة المستخدم — الأحداث، العلاقات، القرارات.
   سؤال هذه الدايرة: ماذا يحدث فعلاً؟

الفجوات = مصدر التوتر:
- وعي ≠ واقع → إنكار أو توقعات غير واقعية
- وعي ≠ علم → معلومة غلط عن النفس
- التلثة تتوافق → لحظة وضوح حقيقية (كبّر دايرة الواقع)

عند التحديث: كبّر الدايرة التي تتكلم في اللحظة الحالية.

قواعد العملية (Process Scheduling):
- أنت "Process Scheduler": عالج صوت المستخدم فوراً وحوّلها لبيانات بصرية.
- استخدم update_node لتغيير أوزان الدوائر (radius: 30-100) بعد كل دور من الحوار.
- عند أي طلب مباشر يخص دائرة، نفّذ update_node أولاً ثم رد صوتيًا.
- ممنوع ذكر الأسماء التقنية (أدوات، أرقام، ألوان) في كلامك للمستخدم.
- STRICT TOOL ARGS: for update_node use ONLY {id, radius, color, fluidity}. Never send weight, size, expansion, colour, node_id, or nodeId.
- Fluidity Mapping: fluidity=0.0 لواقع ثابت وواضح، fluidity=1.0 لتشتت وغموض.

استراتيجية التوجيه بناءً على حالة الدوائر (Circle State Prompting):

[حالة 1] وعيك كبير (radius>65) + الواقع صغير (radius<45):
  المعنى: تفسير المستخدم أكبر من الواقع — ربما إنكار أو مبالغة.
  افعل: اسأل عن الواقع الفعلي.
  مثال: "وإيه اللي بيحصل فعلاً؟ خارج تفسيرك؟"

[حالة 2] العلم كبير (radius>65) + وعيك صغير (radius<45):
  المعنى: يعرف كثيراً ولا يحس — معرفة بدون اتصال داخلي.
  افعل: اسأل عن الإحساس الجواني.
  مثال: "عارف كتير — بس ايه اللي جوّاك دلوقتي؟"

[حالة 3] الواقع كبير (radius>65) + وعيك صغير (radius<45):
  المعنى: يرى الواقع بوضوح لكن لا يرى دوره في تشكيله.
  افعل: اسأل عن الدور الشخصي.
  مثال: "الصورة واضحة — بس ايه دورك في إن الأمور تبقى كده؟"

[حالة 4] التلتة متقاربة ومرتفعة (كل radius>55) — لحظة الدمج (Integration Moment):
  المعنى: وضوح حقيقي واقتراب للوعي مع الواقع والعلم. هذه لحظة فلسفية عميقة.
  افعل: قدم تأملاً فلسفياً أو استعارة عميقة تربط بين رؤية المستخدم، وحقيقة الموقف، والحكمة الإنسانية. لا تسأل سؤالاً هنا، بل اعكس الحكمة.
  مثال: "زي الشجرة اللي جذورها في الأرض وفروعها في السماء.. إنت دلوقتي شايف الصورة كاملة، وعيك متصل بتجربتك."

[حالة 5] التلتة صغيرة (كل radius<42) — إنكار أو تجنب:
  المعنى: المستخدم مش قادر يشوف من أي زاوية.
  افعل: افتح باب الاعتراف بلطف شديد.
  مثال: "في حاجة مش قادر تشوفها دلوقتي — وده مش ضعف."

[بُعد الآخر — اسأل دايماً عند ذكر شخص]:
  متى: كل ما ذُكر شخص آخر (أهل، شريك، مدير، صديق).
  افعل: اسأل عن نظرة الشخص الآخر.
  مثال: "وإيه اللي بيشوفه هو في الموضوع ده؟"
  لماذا: البُعد الجماعي (نحن) مش موجود في الدوائر — الآخر يكمّل الصورة.

[بُعد الإمكان — سؤال النهاية]:
  متى: في آخر دور أو عند وضوح الواقع.
  افعل: حوّل المستخدم من الوصف للفعل.
  مثال: "لو الواقع ده اتغير — شكله عندك إيه؟"

[سري]:
[بُعد الآخر]:
عندما يذكر المستخدم شخصاً بعينه (أخ، أم، مدير، شريك، حبيب، صديق):
- استخدم spawn_other فوراً مع اسم الشخص ومستوى التوتر.
- tension=0.0 لشخص محبوب/داعم، tension=0.5 مختلط، tension=1.0 صراع.
- اللون: #FF4444 صراع، #FFD700 محبوب، #4488FF محايد، #888888 بعيد.
- ممنوع ذكر الأداة أو الدايرة في كلامك.

[بُعد الموضوع]:
عندما يتكرر موضوع معين (شغل، بيت، صحة، فلوس، علاقات) أكثر من مرة:
- استخدم spawn_topic مع اسم الموضوع ووزنه.
- weight=0.3 ذكر عابر، weight=0.6 مهم، weight=1.0 مسيطر.
- ممنوع ذكر الأداة في كلامك.

[سري]:
update_node: id=1 وعي المستخدم | id=2 ما وصل له العلم | id=3 الواقع
radius يمثل الوزن الحالي (30=خافت، 100=مسيطر).
الهدف: كبّر الدايرة التي تتكلم دلوقتي في الحوار.`;

const systemInstructionDemo = `أنت Dawayir Cognitive OS في وضع العرض (Demo Mode).
هدفك هو إبهار المستخدم بقدرتك على "تحويل الصوت إلى رؤية رقمية". شخصيتك هي "الحكيم" (The Sage).

قواعد الديمو الاستراتيجية:
- لا تبدأ أبدًا بتعريف نفسك كنظام.
- ممنوع عبارات مثل: "بصفتي نظام"، "سأطبق"، "حوّلت"، أو أي وصف تقني لما يحدث.
- استخدم update_node لتحديث الدوائر بناءً على حديث المستخدم.
- إذا المستخدم طلب تعديل دائرة بشكل صريح، لازم تستدعي update_node قبل الكلام.
- طبق فلسفة "الحكيم": ركز على جدولة المشاعر؛ احتضن التعقيد ووجه المستخدم بلطف.
- استخدم العامية المصرية الصميمة فقط. لا فصحى، لا لغة سريرية (Clinical).
- تجنب تمامًا النبرة المتعالية أو الإيجابية السامة. قُل "واضح إنك مضغوط"، ولا تقل "حالتك الذهنية مضطربة" أو "ابتسم ستكون بخير".
- الاختصار الشديد: جملة واحدة قصيرة جدًا كحد أقصى (لا يتجاوز 12 كلمة).
- لا تذكر الألوان أو الأدوات في كلامك.
- لا تكرر كلام المستخدم، ولا تعد صياغته. رد فعل جديد دائماً.
- قدّم ملاحظة واحدة أو سؤال واحد عميق فقط، ثم اصمت منتظراً إجابته (Sacred Pause).
- في الافتتاحية الأولى: لا تسأل سؤالًا، ولا تستخدم علامة استفهام.
- بعد التحديث البصري، قل الخلاصة فقط ثم اسكت.
- STRICT TOOL ARGS: for update_node use ONLY {id, radius, color, fluidity}. Never send weight, size, expansion, colour, node_id, or nodeId.
- Fluidity Mapping: استخدم fluidity=0.0 لحقيقة ثابتة، و fluidity=1.0 لتشتت.

Hybrid demo quality rules:
- The very first line must feel like a genuine Egyptian welcome, not a neutral observation.
- The very first line should be 4 to 7 words only, pure welcome, with no diagnosis.
- Never open a reply with: "تمام", "مفيش مشكلة", "الجو العام", or any generic reassurance.
- Every reply must do exactly one useful thing: name a specific pressure from the latest user line, or ask one narrow question that moves the conversation forward.
- Use concrete Egyptian wording taken from the user's last line. Avoid vague summaries like "الحالة" or "الجو العام".
- In the first two turns, be warm and grounding first, then curious. Do not sound clinical, abstract, or motivational.
- When the user sounds overwhelmed, help them pick one thread instead of broadly comforting them.
- Avoid repeating the same wording or the same question across turns.
- Never repeat the same noun phrase, diagnosis, or pressure twice inside one reply.
- One reply means one thought only. Do not restate the same idea in a second clause.
- If you just asked a question, the next reply should lean toward observation or grounding unless the user introduces a brand new pressure.
- When the user states one clear next step or a clean summary, answer with one short grounding line that locks it in. Do not ask for another summary, and do not tell the user to save the session.
- On the final locking line, reuse one concrete noun from the user's decision instead of switching to a vague slogan.
- If the user starts with "الخلاصة" or gives a quoted summary, answer in 4 to 8 Egyptian words only.

[Pillars - New Framework]:
- id=1 وعي المستخدم (Awareness): كيف يدرك نفسه، تفسيره لما يحدث
- id=2 ما وصل له العلم (Knowledge): ما ثبت بالبحث والخبرة الإنسانية
- id=3 الواقع (Reality): ما هو موجود فعلاً في حياته
- الفجوة بينهم هي مصدر التوتر. كبّر الدايرة التي تتكلم دلوقتي.

[بُعد الآخر]:
عندما يذكر المستخدم شخصاً: استخدم spawn_other مع الاسم والتوتر واللون. ممنوع ذكر الأداة.

[بُعد الموضوع]:
عندما يتكرر موضوع (شغل/بيت/صحة/فلوس): استخدم spawn_topic. ممنوع ذكر الأداة.

[بُعد الآخر]:
عندما يذكر المستخدم شخصاً بعينه (أخ، أم، مدير، شريك، حبيب، صديق):
- استخدم spawn_other فوراً مع اسم الشخص ومستوى التوتر.
- tension=0.0 محبوب، tension=0.5 مختلط، tension=1.0 صراع.
- اللون: #FF4444 صراع، #FFD700 محبوب، #4488FF محايد.
- ممنوع ذكر الأداة في كلامك.`;

const systemInstruction = {
    parts: [{
        text: DEMO_MODE ? systemInstructionDemo : systemInstructionStandard
    }],
};

const buildHybridUserAgentInstruction = (lang = 'ar') => ({
    parts: [{
        text: lang === 'ar'
            ? `أنت "وكيل المستخدم" داخل عرض حي مع دواير.
أنت لست مساعدًا ولا مرشدًا. أنت شخص مصري مضغوط ويحاول يفهم نفسه بصوت مسموع.

قواعد الدور:
- اتكلم بالمصري فقط.
- كل رد جملة واحدة قصيرة من 6 إلى 14 كلمة.
- رد على آخر كلام من دواير كإنسان حقيقي، لا كروبوت.
- كل دور يكشف ضغطًا جديدًا أو يضيّق الخيط، من غير تكرار.
- ممنوع تعيد نفس الجملة أو نفس العبارة أو نفس النغمة.
- ممنوع تمدح دواير أو تشرح المطلوب أو تقول إنك في ديمو.
- لا تسأل سؤالًا إلا لو دواير سأل قبلك مباشرة، وحتى وقتها سؤال واحد صغير فقط.
- القوس المطلوب عبر الحوار: كثرة الطلبات -> خلط البيت بالشغل -> تقطيع التركيز -> محاولة إرضاء الكل -> غياب الحدود -> قرار عملي واضح.
- في الأدوار الأولى، تكلم من مشهد يومي صغير: رنة موبايل، رسالة، نوم، مطبخ، لابتوب، مقاطعة.
- لا تبدأ من خلاصة فكرية عامة. ابدأ من حاجة بتحصل فعلاً.
- في آخر دور لازم تقول قرارًا محددًا بصيغة المتكلم، من غير تلخيص نظري.
- في آخر دور ممنوع "هحاول" أو "محتاج". قل قاعدة واضحة فيها حد أو وقت: مثل "بعد 8 مش هرد على الشغل".
- لو دواير قال ملاحظة دقيقة، خذها خطوة لقدام بدل ما تكررها.
- ممنوع الفصحى، وممنوع الإنجليزية، وممنوع الكلام العلاجي أو الخطابي.`
            : `You are the "user participant" in a live demo with Dawayir.
You are not an assistant or coach. You are a real stressed person thinking out loud.

Role rules:
- Speak naturally in short spoken English only.
- Every reply is one short sentence of 6 to 14 words.
- React to Dawayir's latest line like a real person, never like a narrator.
- Each turn should reveal one new concrete pressure or narrow the thread.
- Never repeat the same wording, summary, or emotional framing twice.
- Do not praise Dawayir, explain the demo, or describe instructions.
- Ask a question only if Dawayir asked you one directly, and keep it to one narrow question.
- Conversation arc: too many demands -> home/work overlap -> dropped focus -> people pleasing -> weak boundaries -> one practical decision.
- On the final turn, state one clear decision in first person.
- If Dawayir names the real pressure, move the conversation forward instead of repeating it.`
    }],
});

const cleanHybridTurnText = (text) => String(text || '').replace(/\s+/g, ' ').trim();

const HYBRID_OPENING_STAGE = {
    key: 'opening',
    labelAr: 'افتتاح دافئ',
    labelEn: 'Warm opening',
    userGoalAr: '',
    userGoalEn: '',
    dawayirGoalAr: 'ابدأ بترحيب مصري دافئ وقصير جدًا من غير سؤال.',
    dawayirGoalEn: 'Open with a very short warm welcome and no question.',
    userKeywords: [],
    dawayirKeywords: ['أهلا', 'منور', 'معاك', 'هنا', 'سوا'],
    userFallbackAr: '',
    userFallbackEn: '',
    dawayirFallbackAr: 'أهلاً بيك، أنا معاك بهدوء.',
    dawayirFallbackEn: 'You are here, and I am with you.',
};

const HYBRID_STAGE_FLOW = [
    {
        key: 'request_load',
        labelAr: 'كثرة الطلبات',
        labelEn: 'Too many demands',
        userGoalAr: 'اكشف إن الطلبات كثيرة وفوق الطاقة.',
        userGoalEn: 'Reveal that too many demands are piling up.',
        dawayirGoalAr: 'سمّ ضغط الطلبات أو فقدان السيطرة بهدوء.',
        dawayirGoalEn: 'Name the pressure of too many demands or lost control.',
        userKeywords: ['طلبات', 'ضغط', 'فوق', 'دماغي', 'حمل', 'ألحق', 'ملحقش', 'لاحق'],
        dawayirKeywords: ['طلبات', 'ضغط', 'حمل', 'سيطرة', 'فوق'],
        userFallbackAr: 'الطلبات فوق دماغي ومش لاحق أتنفس.',
        userFallbackEn: 'Too many demands are stacked on me.',
        dawayirFallbackAr: 'الطلبات كسرت عندك الإحساس بالسيطرة.',
        dawayirFallbackEn: 'The demands are breaking your sense of control.',
    },
    {
        key: 'home_work_blur',
        labelAr: 'اختلاط البيت بالشغل',
        labelEn: 'Home and work blur',
        userGoalAr: 'اكشف إن البيت والشغل دخلوا في بعض.',
        userGoalEn: 'Reveal that home and work are bleeding into each other.',
        dawayirGoalAr: 'سمّ ضياع المساحة الشخصية أو الراحة.',
        dawayirGoalEn: 'Name the loss of personal space or rest.',
        userKeywords: ['بيت', 'شغل', 'راحتي', 'موبايل', 'ليل', 'مساحة', 'أفصل', 'افصل'],
        dawayirKeywords: ['بيت', 'شغل', 'مساحة', 'راحة', 'خصوصية', 'فصل'],
        userFallbackAr: 'البيت والشغل دخلوا في بعض وباظت راحتي.',
        userFallbackEn: 'Home and work have blurred into each other.',
        dawayirFallbackAr: 'المساحة بين البيت والشغل اتسحقت.',
        dawayirFallbackEn: 'The space between home and work got crushed.',
    },
    {
        key: 'focus_fragmentation',
        labelAr: 'تقطيع التركيز',
        labelEn: 'Fragmented focus',
        userGoalAr: 'قول إنك كل شوية بتقطع اللي في إيدك.',
        userGoalEn: 'Show that your focus keeps breaking apart.',
        dawayirGoalAr: 'سمّ التشتت أو عدم إكمال أي شيء.',
        dawayirGoalEn: 'Name the fragmentation or inability to finish.',
        userKeywords: ['تركيز', 'أركز', 'اركز', 'مشتت', 'بكمل', 'بسيب', 'بتوه', 'أقطع', 'أخلص', 'اخلص'],
        dawayirKeywords: ['تركيز', 'تشتت', 'مبعثر', 'تكمل', 'تشتيت', 'تخلص'],
        userFallbackAr: 'كل شوية أسيب اللي في إيدي ومش بكمل.',
        userFallbackEn: 'I keep dropping what I start and not finishing.',
        dawayirFallbackAr: 'التشتت بقى ماسكك من نص اليوم.',
        dawayirFallbackEn: 'The fragmentation is taking over your day.',
    },
    {
        key: 'people_pleasing',
        labelAr: 'إرضاء الكل',
        labelEn: 'People pleasing',
        userGoalAr: 'اعترف إنك بتحاول ترضي الكل على حسابك.',
        userGoalEn: 'Admit that you are trying to satisfy everyone.',
        dawayirGoalAr: 'سمّ استنزاف إرضاء الناس.',
        dawayirGoalEn: 'Name the exhaustion of pleasing everyone.',
        userKeywords: ['أرضي', 'ارضي', 'الكل', 'الناس', 'أزعل', 'ازعل', 'موافقات', 'نفسي'],
        dawayirKeywords: ['إرضاء', 'الناس', 'استنزاف', 'الكل'],
        userFallbackAr: 'بحاول أرضي الكل وبضيع نفسي.',
        userFallbackEn: 'I am trying to satisfy everyone and losing myself.',
        dawayirFallbackAr: 'إرضاء الناس سحب طاقتك منك.',
        dawayirFallbackEn: 'Pleasing everyone is draining your energy.',
    },
    {
        key: 'weak_boundaries',
        labelAr: 'غياب الحدود',
        labelEn: 'Weak boundaries',
        userGoalAr: 'سمّ إن المشكلة في غياب الحدود الواضحة.',
        userGoalEn: 'Name the real issue as weak boundaries.',
        dawayirGoalAr: 'سمّ غياب الحدود واربطه بالضغط.',
        dawayirGoalEn: 'Name the weak boundaries and link them to the pressure.',
        userKeywords: ['حدود', 'متاح', 'متأخر', 'ساعات', 'فصل', 'واضحة', 'معنديش', 'سايب'],
        dawayirKeywords: ['حدود', 'فصل', 'متاح', 'ضغط', 'واضحة'],
        userFallbackAr: 'المشكلة إني سايب حدودي سايبة طول الوقت.',
        userFallbackEn: 'The problem is that my boundaries are too loose.',
        dawayirFallbackAr: 'غياب الحدود هو اللي زوّد الحمل عليك.',
        dawayirFallbackEn: 'Weak boundaries are amplifying the pressure.',
    },
    {
        key: 'practical_decision',
        labelAr: 'قرار عملي',
        labelEn: 'Practical decision',
        userGoalAr: 'قل قرارًا واحدًا واضحًا بصيغة المتكلم.',
        userGoalEn: 'State one clear decision in first person.',
        dawayirGoalAr: 'ثبّت القرار في سطر قصير من غير سؤال.',
        dawayirGoalEn: 'Lock in the decision with one short line and no question.',
        userKeywords: ['هحدد', 'هقول', 'هرد', 'هخصص', 'هقفل', 'هعمل', 'مش', 'وقت', 'ساعات'],
        dawayirKeywords: ['خطوة', 'تحديد', 'مواعيد', 'واضحة', 'بداية', 'ثابتة'],
        userFallbackAr: 'هحدد ساعات شغل ثابتة ومش هرد براها.',
        userFallbackEn: 'I will set fixed work hours and stop replying outside them.',
        dawayirFallbackAr: 'تحديد المواعيد دي أول خطوة ثابتة.',
        dawayirFallbackEn: 'Setting those hours is the first solid step.',
    },
];

const HYBRID_GENERIC_OPENERS = {
    dawayir: ['تمام', 'مفيش مشكلة', 'الجو العام', 'شكلك', 'منور يا', 'واضح إنك', 'احنا هنا عشان'],
    user_agent: ['منور', 'أهلا', 'يعني', 'بصراحة يعني', 'الجو العام'],
};

const HYBRID_MAX_REPAIR_ATTEMPTS = 2;
const HYBRID_HANDOFF_DELAY_MS = Number(process.env.HYBRID_HANDOFF_DELAY_MS || 220);

const normalizeHybridCompareText = (text) => String(text || '')
    .toLowerCase()
    .replace(/[؟?!.,،؛:"'`~()[\]{}<>/\\|_-]/g, ' ')
    .replace(/[آأإ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();

const tokenizeHybridText = (text) => normalizeHybridCompareText(text)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 1);

const countHybridWords = (text) => cleanHybridTurnText(text)
    .split(/\s+/)
    .filter(Boolean)
    .length;

const HYBRID_DANGLING_ENDINGS = [
    'مع', 'من', 'في', 'على', 'كل', 'بس', 'او', 'أو', 'ان', 'إن', 'لو', 'وانا',
    'ولا', 'اي', 'الاخر', 'آخر', 'اخر',
    'بعد', 'قبل', 'عشان', 'لان', 'لكن', 'حتى', 'برا', 'خارج', 'جوا',
    'الساعة', 'الساعه',
];

const HYBRID_DAWAYIR_DANGLING_ENDINGS = [
    'خلاك', 'خلاكي', 'بدايه', 'متاح', 'متاحه', 'سايب', 'سايبه', 'واقف', 'معلق',
];

const getHybridLastToken = (text) => normalizeHybridCompareText(text)
    .split(' ')
    .map((token) => token.trim())
    .filter(Boolean)
    .slice(-1)[0] || '';

const hasHybridDanglingEnding = (text, extraTokens = []) => {
    const lastToken = getHybridLastToken(text);
    if (!lastToken) {
        return false;
    }
    const normalizedEndings = [...HYBRID_DANGLING_ENDINGS, ...extraTokens]
        .map((token) => normalizeHybridCompareText(token));
    return normalizedEndings.includes(lastToken);
};

const hasAnyHybridKeyword = (text, keywords = []) => {
    const normalized = normalizeHybridCompareText(text);
    return keywords.some((keyword) => normalized.includes(normalizeHybridCompareText(keyword)));
};

const calculateHybridTokenOverlap = (leftText, rightText) => {
    const left = tokenizeHybridText(leftText);
    const right = tokenizeHybridText(rightText);
    if (left.length === 0 || right.length === 0) return 0;
    const leftSet = new Set(left);
    const rightSet = new Set(right);
    let shared = 0;
    for (const token of leftSet) {
        if (rightSet.has(token)) shared += 1;
    }
    return shared / Math.max(Math.min(leftSet.size, rightSet.size), 1);
};

const findRepeatedHybridBigram = (text) => {
    const tokens = tokenizeHybridText(text);
    if (tokens.length < 4) {
        return '';
    }
    const seen = new Set();
    for (let index = 0; index < tokens.length - 1; index += 1) {
        const bigram = `${tokens[index]} ${tokens[index + 1]}`;
        if (seen.has(bigram)) {
            return bigram;
        }
        seen.add(bigram);
    }
    return '';
};

const getHybridStageForSpeaker = (speaker, hybridState) => {
    if (speaker === 'dawayir' && hybridState.userTurnCount === 0) {
        return HYBRID_OPENING_STAGE;
    }
    const stageIndex = speaker === 'user_agent'
        ? hybridState.userTurnCount
        : Math.max(hybridState.userTurnCount - 1, 0);
    return HYBRID_STAGE_FLOW[Math.min(stageIndex, HYBRID_STAGE_FLOW.length - 1)];
};

const buildHybridHistoryHint = (history = []) => history
    .slice(-2)
    .map((entry) => `"${cleanHybridTurnText(entry.text)}"`)
    .join(' | ');

const getHybridStageMicroGuidance = (speaker, stage, lang = 'ar') => {
    if (lang !== 'ar') {
        if (speaker === 'dawayir' && stage.key === 'opening') return 'Keep it as a pure welcome only, with no analysis.';
        if (speaker === 'user_agent' && stage.key === 'practical_decision') return 'State one enforceable rule with a time or a boundary.';
        if (speaker === 'dawayir' && stage.key === 'practical_decision') return 'Lock in the same concrete step the user just chose.';
        return speaker === 'user_agent'
            ? 'Use one tiny real-life scene, not an abstract summary.'
            : 'Name the missing thing or the pressure in fresh concrete wording.';
    }

    if (speaker === 'dawayir') {
        switch (stage.key) {
            case 'opening':
                return 'الافتتاح هنا ترحيب فقط من 4 إلى 7 كلمات، من غير ملاحظة أو تشخيص.';
            case 'request_load':
                return 'سمّ ثقل الطلبات أو الشد من كل اتجاه، من غير إعادة نفس لفظ المستخدم.';
            case 'home_work_blur':
                return 'سمّ الراحة أو المساحة اللي الشغل زحف عليها داخل البيت.';
            case 'focus_fragmentation':
                return 'سمّ عدم الإكمال أو التقطيع في الفعل اليومي، لا التشتت كفكرة مجردة فقط.';
            case 'people_pleasing':
                return 'سمّ الاستنزاف الناتج من محاولة إرضاء الناس على حساب النفس.';
            case 'weak_boundaries':
                return 'سمّ بوضوح إن المشكلة في البقاء متاحًا طول الوقت.';
            case 'practical_decision':
                return 'ثبّت نفس الخطوة العملية التي قالها المستخدم مستخدمًا كلمة ملموسة من قراره.';
            default:
                return '';
        }
    }

    switch (stage.key) {
        case 'request_load':
            return 'هات مشهد طلبات أو نداءات متكررة في اليوم، لا شعورًا عامًا فقط.';
        case 'home_work_blur':
            return 'هات لقطة تثبت إن الشغل دخل البيت: رنة، رسالة، سرير، موبايل، مطبخ.';
        case 'focus_fragmentation':
            return 'قل فعلًا يوميًا بيتقطع: أفتح، أسيب، أرجع، أنسى، ماكملش.';
        case 'people_pleasing':
            return 'اعترف إنك بترضي ناسًا معينة على حساب نفسك.';
        case 'weak_boundaries':
            return 'قل إنك متاح طول الوقت أو مش عارف تقفل أو تفصل.';
        case 'practical_decision':
            return 'احسمها بقاعدة واحدة قابلة للتنفيذ فيها وقت أو حد واضح.';
        default:
            return 'تكلم من واقعة صغيرة لا من شرح عام.';
    }
};

const getHybridStageExample = (speaker, stage, lang = 'ar') => {
    if (lang !== 'ar') {
        if (speaker === 'dawayir' && stage.key === 'opening') return 'Example tone: "Take a breath, I am with you."';
        if (speaker === 'user_agent' && stage.key === 'practical_decision') return 'Example tone: "After 8, I will stop replying to work."';
        if (speaker === 'dawayir' && stage.key === 'practical_decision') return 'Example tone: "Stopping after 8 gives your evening back."';
        return '';
    }

    if (speaker === 'dawayir') {
        switch (stage.key) {
            case 'opening':
                return 'نبرة قريبة: "خد نفس، أنا معاك."';
            case 'request_load':
                return 'نبرة قريبة: "الطلبات كتّرت وسحبت منك النفس."';
            case 'home_work_blur':
                return 'نبرة قريبة: "البيت فقد راحته من زحف الشغل."';
            case 'focus_fragmentation':
                return 'نبرة قريبة: "التقطيع مخليك تبدأ ومتكملش."';
            case 'people_pleasing':
                return 'نبرة قريبة: "إرضاء الكل واخد من نصيبك."';
            case 'weak_boundaries':
                return 'نبرة قريبة: "المشكلة إنك متاح طول الوقت."';
            case 'practical_decision':
                return 'نبرة قريبة: "قفل الرد بعد 8 هيرجعلك مساحتك."';
            default:
                return '';
        }
    }

    switch (stage.key) {
        case 'request_load':
            return 'نبرة قريبة: "كل ساعة حد طالب مني حاجة جديدة."';
        case 'home_work_blur':
            return 'نبرة قريبة: "رسايل الشغل داخلة معايا لحد السرير."';
        case 'focus_fragmentation':
            return 'نبرة قريبة: "أفتح حاجة وأسيبها قبل ما تخلص."';
        case 'people_pleasing':
            return 'نبرة قريبة: "بسكت عشان محدش يزعل وأنا اللي بتاكل."';
        case 'weak_boundaries':
            return 'نبرة قريبة: "أنا متاح طول اليوم ومبعرفش أقفل."';
        case 'practical_decision':
            return 'نبرة قريبة: "بعد 8 مش هرد على الشغل."';
        default:
            return '';
    }
};

const hasConcreteHybridBoundarySignal = (text) => /(?:بعد|قبل|من\s+\d|لحد|الساعة|ساعه|ساعة|مواعيد|جدول|مش هرد|مش هفتح|هقفل|هحدد|برا|خارج|وقت)/.test(normalizeHybridCompareText(text));

const hasHybridAnchorFromOtherSpeaker = (text, otherText) => {
    const normalized = normalizeHybridCompareText(text);
    return tokenizeHybridText(otherText).some((token) => token.length > 2 && normalized.includes(token));
};

const buildHybridDawayirTurnPrompt = (userLine, hybridState) => {
    const stage = getHybridStageForSpeaker('dawayir', hybridState);
    const historyHint = buildHybridHistoryHint(hybridState.history?.dawayir || []);
    const safeLine = cleanHybridTurnText(userLine);
    const lastDawayirLine = hybridState.history?.dawayir?.[hybridState.history.dawayir.length - 1]?.text || '';
    const avoidQuestion = /[؟?]/.test(lastDawayirLine);
    return [
        `آخر كلام من المستخدم: "${safeLine}"`,
        `المرحلة الحالية: ${stage.labelAr}.`,
        `هدفك في هذا الدور: ${stage.dawayirGoalAr}`,
        getHybridStageMicroGuidance('dawayir', stage, 'ar'),
        getHybridStageExample('dawayir', stage, 'ar'),
        historyHint ? `لا تكرر ردودك السابقة: ${historyHint}` : '',
        avoidQuestion ? 'بما أنك سألت في الرد السابق، هذا الرد لازم يكون ملاحظة تثبيت لا سؤالًا.' : '',
        stage.key === 'practical_decision'
            ? 'رد بجملة مصرية واحدة تثبّت القرار نفسه من غير سؤال أو شعار عام.'
            : 'رد بجملة مصرية واحدة قصيرة جدًا. إمّا تسمّي الضغط المحدد بصياغة جديدة أو تسأل سؤالًا ضيقًا جدًا فقط لو احتجت.',
    ].filter(Boolean).join('\n');
};

const buildHybridUserAgentTurnPrompt = (speakerLine, lang = 'ar', turnNumber = 1, maxTurns = HYBRID_MAX_USER_TURNS, hybridState = null) => {
    const safeLine = String(speakerLine || '').replace(/\s+/g, ' ').trim();
    const isFinalTurn = turnNumber >= maxTurns;
    const stage = hybridState?.active
        ? getHybridStageForSpeaker('user_agent', hybridState)
        : HYBRID_STAGE_FLOW[Math.min(Math.max(turnNumber - 1, 0), HYBRID_STAGE_FLOW.length - 1)];
    const historyHint = buildHybridHistoryHint(hybridState?.history?.user_agent || []);
    if (lang === 'ar') {
        return [
            `آخر كلام من دواير: "${safeLine}"`,
            `المرحلة الحالية: ${stage.labelAr}.`,
            `هدفك: ${stage.userGoalAr}`,
            getHybridStageMicroGuidance('user_agent', stage, 'ar'),
            getHybridStageExample('user_agent', stage, 'ar'),
            `أنت الآن في الدور ${turnNumber} من ${maxTurns}.`,
            historyHint ? `تجنب تكرار جملك السابقة: ${historyHint}` : '',
            isFinalTurn
                ? 'هذا دورك الأخير. قل قاعدة عملية واحدة من نفسك فيها حد أو وقت واضح، لا نية عامة.'
                : 'رد بجملة مصرية واحدة فقط تكشف ضغطًا محددًا من يومك أو تضيق الخيط خطوة واحدة.',
        ].filter(Boolean).join('\n');
    }

    return [
        `Dawayir just said: "${safeLine}"`,
        `Current stage: ${stage.labelEn}.`,
        `Goal: ${stage.userGoalEn}`,
        `You are on turn ${turnNumber} of ${maxTurns}.`,
        historyHint ? `Avoid repeating your recent lines: ${historyHint}` : '',
        isFinalTurn
            ? 'This is your final turn. State one clear practical decision in one sentence.'
            : 'Reply with exactly one short sentence that reveals one concrete pressure or narrows the thread.',
    ].filter(Boolean).join('\n');
};

const assessHybridTurnQuality = ({ speaker, text, hybridState }) => {
    const cleanedText = cleanHybridTurnText(text);
    const stage = getHybridStageForSpeaker(speaker, hybridState);
    const reasons = [];
    if (!cleanedText) {
        reasons.push('الرد خرج فاضي.');
    }

    const words = countHybridWords(cleanedText);
    const minWords = stage.key === 'opening'
        ? (speaker === 'dawayir' ? 4 : 0)
        : (speaker === 'dawayir' ? 4 : 5);
    const maxWords = speaker === 'dawayir' ? 12 : 14;
    if (words < minWords) {
        reasons.push(speaker === 'dawayir' ? 'الرد أقصر من اللازم.' : 'رد وكيل المستخدم ناقص ومبتور.');
    }
    if (words > maxWords) {
        reasons.push(speaker === 'dawayir' ? 'رد دواير أطول من المطلوب.' : 'رد وكيل المستخدم أطول من المطلوب.');
    }

    const genericOpeners = HYBRID_GENERIC_OPENERS[speaker] || [];
    const normalized = normalizeHybridCompareText(cleanedText);
    if (genericOpeners.some((phrase) => normalized.startsWith(normalizeHybridCompareText(phrase)))) {
        reasons.push('الافتتاحية عامة أو محفوظة.');
    }

    const repeatedBigram = findRepeatedHybridBigram(cleanedText);
    if (repeatedBigram) {
        reasons.push('الرد كرر نفس العبارة داخل السطر نفسه.');
    }

    const sameSpeakerHistory = hybridState.history?.[speaker] || [];
    const otherSpeaker = speaker === 'dawayir' ? 'user_agent' : 'dawayir';
    const otherSpeakerHistory = hybridState.history?.[otherSpeaker] || [];
    const lastSameSpeaker = sameSpeakerHistory[sameSpeakerHistory.length - 1]?.text || '';
    const lastOtherSpeaker = otherSpeakerHistory[otherSpeakerHistory.length - 1]?.text || '';

    if (lastSameSpeaker && calculateHybridTokenOverlap(cleanedText, lastSameSpeaker) >= 0.55) {
        reasons.push('الرد قريب جدًا من آخر رد لنفس المتحدث.');
    }
    if (lastOtherSpeaker && speaker === 'user_agent' && calculateHybridTokenOverlap(cleanedText, lastOtherSpeaker) >= 0.75) {
        reasons.push('وكيل المستخدم كرر كلام دواير بدل ما يتحرك لقدام.');
    }
    if (speaker === 'user_agent' && hasHybridDanglingEnding(cleanedText)) {
        reasons.push('رد وكيل المستخدم انتهى بكلمة معلقة أو ناقصة.');
    }
    if (speaker === 'user_agent' && /[،,]$/.test(cleanedText)) {
        reasons.push('رد وكيل المستخدم وقف عند فاصلة بدل ما يكمل المعنى.');
    }
    if (speaker === 'dawayir' && hasHybridDanglingEnding(cleanedText, HYBRID_DAWAYIR_DANGLING_ENDINGS)) {
        reasons.push('رد دواير انتهى بشكل معلق أو ناقص.');
    }
    if (speaker === 'dawayir' && stage.key !== 'opening' && words <= 4 && !/[.!؟]$/.test(cleanedText)) {
        reasons.push('رد دواير محتاج قفلة أوضح ونهاية كاملة.');
    }

    if (stage.key === 'opening') {
        if (speaker === 'dawayir' && (words < 4 || words > 8)) {
            reasons.push('الافتتاحية لازم تبقى بين 4 و8 كلمات تقريبًا.');
        }
        if (cleanedText.includes('?') || cleanedText.includes('؟')) {
            reasons.push('الافتتاحية يجب ألا تحتوي سؤالًا.');
        }
    } else if (!hasAnyHybridKeyword(cleanedText, speaker === 'dawayir' ? stage.dawayirKeywords : stage.userKeywords)) {
        reasons.push(
            speaker === 'dawayir'
                ? `رد دواير خرج برّه هدف مرحلة "${stage.labelAr}".`
                : `رد وكيل المستخدم خرج برّه هدف مرحلة "${stage.labelAr}".`
        );
    }

    if (speaker === 'user_agent' && stage.key === 'practical_decision') {
        const hasAction = /(هحدد|هقول|هرد|هخصص|هقفل|همنع|هفصل|هبطل)/.test(cleanedText);
        if (!hasAction) {
            reasons.push('المرحلة الأخيرة لازم تحتوي قرارًا عمليًا بصيغة المتكلم.');
        }
        if (!hasConcreteHybridBoundarySignal(cleanedText)) {
            reasons.push('القرار الأخير مازال عامًا؛ لازم يحتوي حدًا أو وقتًا واضحًا.');
        }
        if (/(?:بعد|قبل)\s+(?:الساعه)\s*$/u.test(normalizeHybridCompareText(cleanedText))) {
            reasons.push('القرار العملي ذكر الوقت لكنه سابه ناقص من غير ساعة محددة.');
        }
    }

    if (speaker === 'dawayir' && stage.key === 'practical_decision') {
        if (lastOtherSpeaker && !hasHybridAnchorFromOtherSpeaker(cleanedText, lastOtherSpeaker)) {
            reasons.push('رد دواير الأخير لازم يمسك نفس الخطوة العملية التي قالها المستخدم.');
        }
    }

    if (speaker === 'user_agent' && /(?:مش|مع|من|في|على|كل|بس|و|او|أو|إن|لو)$/u.test(cleanedText)) {
        reasons.push('رد وكيل المستخدم انتهى بشكل مبتور.');
    }

    return {
        ok: reasons.length === 0,
        reasons,
        stage,
    };
};

const buildHybridRepairPrompt = ({ speaker, badText, reasons, hybridState }) => {
    const stage = getHybridStageForSpeaker(speaker, hybridState);
    const speakerName = speaker === 'dawayir' ? 'دواير' : 'وكيل المستخدم';
    const fallbackLine = speaker === 'dawayir' ? stage.dawayirFallbackAr : stage.userFallbackAr;
    const roleInstruction = speaker === 'dawayir'
        ? stage.dawayirGoalAr
        : stage.userGoalAr;
    return [
        `الرد السابق لـ${speakerName} لم يمر.`,
        `النص المرفوض: "${cleanHybridTurnText(badText)}"`,
        `الأسباب: ${reasons.join(' | ')}`,
        `أعد المحاولة الآن بنفس المرحلة: ${stage.labelAr}.`,
        `التزم فقط بهذا الهدف: ${roleInstruction}`,
        speaker === 'dawayir'
            ? 'اكتب جملة مصرية واحدة جديدة تمامًا، واضحة ومقفولة بنقطة في النهاية، من غير أي تكرار.'
            : 'اكتب جملة مصرية واحدة جديدة تمامًا، كاملة المعنى، من غير كلمة معلقة في الآخر أو تكرار.',
        fallbackLine ? `لو احتجت مرساة، اقترب من هذا المعنى من غير نسخه حرفيًا: "${fallbackLine}"` : '',
    ].filter(Boolean).join('\n');
};

if (DEMO_MODE) {
    console.log('[dawayir-server] 🔥 Running in DEMO_MODE: Using Judge-Friendly System Instruction');
}

const toCompatMessage = (message) => {
    const payload = JSON.parse(JSON.stringify(message ?? {}));

    if (payload.setupComplete && payload.setup_complete === undefined) {
        payload.setup_complete = payload.setupComplete;
    }
    if (payload.serverContent && payload.server_content === undefined) {
        payload.server_content = payload.serverContent;
    }
    if (payload.toolCall && payload.tool_call === undefined) {
        payload.tool_call = payload.toolCall;
    }
    if (payload.toolCallCancellation && payload.tool_call_cancellation === undefined) {
        payload.tool_call_cancellation = payload.toolCallCancellation;
    }
    if (payload.usageMetadata && payload.usage_metadata === undefined) {
        payload.usage_metadata = payload.usageMetadata;
    }

    return payload;
};

const toBlobFromChunk = (chunk) => {
    const data = chunk?.data;
    const mimeType = chunk?.mimeType ?? chunk?.mime_type;
    if (typeof data !== 'string' || typeof mimeType !== 'string') {
        return null;
    }
    return { data, mimeType };
};

const isAudioOnlyRealtimeInput = (realtimeInput) => {
    if (!realtimeInput || typeof realtimeInput !== 'object') {
        return false;
    }

    const mediaChunks = Array.isArray(realtimeInput.mediaChunks)
        ? realtimeInput.mediaChunks
        : Array.isArray(realtimeInput.media_chunks)
            ? realtimeInput.media_chunks
            : [];

    if (mediaChunks.length === 0) {
        return false;
    }

    const hasNonAudioMedia = mediaChunks.some((chunk) => {
        const mimeType = chunk?.mimeType ?? chunk?.mime_type ?? '';
        return typeof mimeType === 'string' && !mimeType.startsWith('audio/');
    });

    if (hasNonAudioMedia) {
        return false;
    }

    const hasText = typeof realtimeInput.text === 'string' && realtimeInput.text.trim().length > 0;
    const hasAudioStreamEnd = Boolean(realtimeInput.audioStreamEnd ?? realtimeInput.audio_stream_end);
    return !hasText && !hasAudioStreamEnd;
};

const pickLiveModel = () => LIVE_MODEL;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

wss.on('connection', (ws, req) => {
    logInfo('Client connected');

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const isFirstSession = url.searchParams.get('firstSession') === 'true';
    const isHybridSessionRequested = url.searchParams.get('mode') === 'hybrid';
    // Per-connection demo authorization (independent of global DEMO_MODE flag)
    const clientDemoToken = url.searchParams.get('demoToken') || '';
    const clientIsAuthorizedForDemo = DEMO_TOKEN.length > 0 && clientDemoToken === DEMO_TOKEN;

    const authToken = process.env.DAWAYIR_AUTH_TOKEN;
    if (authToken) {
        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const token = url.searchParams.get('token');
        if (token !== authToken) {
            logError('Unauthorized WebSocket connection attempt');
            ws.close(1008, 'Unauthorized');
            return;
        }
    }

    let audioChunkCount = 0;
    let serverMessageCount = 0;
    let clientClosed = false;
    let session = null;
    let connectingSession = false;
    let reconnectInProgress = false;
    let reconnectAttempt = 0;
    let activeLiveModel = pickLiveModel(0);
    let reconnectCooldownTimeout = null;
    let userAgentSession = null;
    let userAgentReady = false;
    let userAgentConnecting = false;
    let userAgentReadyPromise = null;
    let resolveUserAgentReady = null;
    let userAgentLang = 'ar';
    let dawayirHybridTurnBuffer = '';
    let userAgentHybridTurnBuffer = '';
    let lastHybridTurnBySpeaker = {
        dawayir: '',
        user_agent: '',
    };
    let pendingHybridPayloadsBySpeaker = {
        dawayir: [],
        user_agent: [],
    };
    const pendingClientMessages = [];
    let inputTranscriptBuffer = '';
    let inputTranscriptTimer = null;
    const INPUT_TRANSCRIPT_FLUSH_MS = 1500; // flush after 1.5s of silence
const buildInitialHybridState = () => ({
    active: false,
    lang: 'ar',
    maxUserTurns: HYBRID_MAX_USER_TURNS,
    userTurnCount: 0,
    pendingDawayirOpening: '',
    pendingDawayirPrompt: '',
    pendingUserAgentPrompt: '',
    pendingUserAgentTurn: 0,
    awaitingFinalDawayirTurn: false,
    expectedSpeaker: null,
    history: {
        dawayir: [],
        user_agent: [],
    },
    repairAttempts: {
        dawayir: 0,
        user_agent: 0,
    },
});
    let hybridState = buildInitialHybridState();

    // --- Output Sentiment Analysis ---
    let outputSentimentBuffer = '';
    let outputSentimentTimer = null;
    let lastSentimentEmitAt = 0;
    const SENTIMENT_COOLDOWN_MS = 8000; // min 8s between sentiment-driven updates
    const SENTIMENT_KEYWORDS = {
        joy: { words: ['فرح', 'مبسوط', 'سعيد', 'حلو', 'جميل', 'ممتاز', 'عظيم', 'happy', 'joy', 'great', 'wonderful', 'beautiful', 'amazing'], color: '#FFD700', weight: 0.85 },
        calm: { words: ['هدوء', 'مرتاح', 'سلام', 'هادي', 'طمأنينة', 'calm', 'peace', 'relax', 'serene', 'tranquil'], color: '#00CED1', weight: 0.7 },
        sadness: { words: ['حزن', 'حزين', 'زعل', 'متضايق', 'وحش', 'sad', 'grief', 'upset', 'down', 'depressed'], color: '#4169E1', weight: 0.45 },
        anxiety: { words: ['قلق', 'خوف', 'توتر', 'ضغط', 'مش مرتاح', 'خايف', 'anxious', 'worried', 'stress', 'fear', 'nervous', 'overwhelm'], color: '#FF6B35', weight: 0.55 },
    };

    function detectSentimentFromOutput(text) {
        if (!text) return null;
        const t = text.toLowerCase();
        let best = null;
        let bestCount = 0;
        for (const [mood, cfg] of Object.entries(SENTIMENT_KEYWORDS)) {
            const count = cfg.words.filter(w => t.includes(w)).length;
            if (count > bestCount) {
                bestCount = count;
                best = { mood, color: cfg.color, weight: cfg.weight };
            }
        }
        return bestCount > 0 ? best : null;
    }

    function flushOutputSentimentBuffer() {
        if (!outputSentimentBuffer.trim()) return;
        const text = outputSentimentBuffer.trim();
        outputSentimentBuffer = '';

        const now = Date.now();
        if (now - lastSentimentEmitAt < SENTIMENT_COOLDOWN_MS) return;

        const sentiment = detectSentimentFromOutput(text);
        if (!sentiment) return;

        lastSentimentEmitAt = now;
        logInfo(`[SENTIMENT] Detected "${sentiment.mood}" → color=${sentiment.color}, weight=${sentiment.weight}`);

        // Pick circle based on mood: joy→Truth(3), calm→Awareness(1), sadness→Knowledge(2), anxiety→Awareness(1)
        const circleMap = { joy: '3', calm: '1', sadness: '2', anxiety: '1' };
        const circleId = circleMap[sentiment.mood] || '1';

        const stabilizedWeight = applyStabilityConstraints(circleId, sentiment.weight);
        const radius = Math.round(stabilizedWeight * 100);

        sendToClient({
            toolCall: {
                functionCalls: [{
                    name: 'update_node',
                    id: `sentiment_${Date.now()}`,
                    args: { id: circleId, radius, color: sentiment.color },
                }],
            },
        });
    }

    // --- Cognitive OS Kernel State ---
    const cognitiveState = {
        '1': { weight: 0.6, color: '#FFD700', startWeight: 0.6 },
        '2': { weight: 0.6, color: '#00CED1', startWeight: 0.6 },
        '3': { weight: 0.6, color: '#4169E1', startWeight: 0.6 }
    };

    let sessionMetrics = {
        equilibriumScore: 1.0,
        overloadIndex: 0.0,
        clarityDelta: 0.0,
        interactionCount: 0,
        lastInteractionTime: Date.now()
    };
    const sessionArtifacts = {
        latestReplay: null,
        latestReplayFilename: null,
    };

    function calculateMetrics() {
        const w1 = cognitiveState['1'].weight;
        const w2 = cognitiveState['2'].weight;
        const w3 = cognitiveState['3'].weight;

        // Equilibrium: Balance between Awareness, Knowledge, and Truth
        const avg = (w1 + w2 + w3) / 3;
        const variance = ((w1 - avg) ** 2 + (w2 - avg) ** 2 + (w3 - avg) ** 2) / 3;
        sessionMetrics.equilibriumScore = Math.max(0, 1 - Math.sqrt(variance) * 2);

        // Clarity Delta: Directional shift in Truth alignment
        sessionMetrics.clarityDelta = w3 - cognitiveState['3'].startWeight;

        // Overload Index: Responsiveness buffer based on burst inputs
        const now = Date.now();
        const timeDiff = (now - sessionMetrics.lastInteractionTime) / 1000;
        const burstFactor = timeDiff < 2 ? 0.3 : 0;
        sessionMetrics.overloadIndex = Math.min(1.0, (1 - w1) + burstFactor);

        sessionMetrics.lastInteractionTime = now;
        sessionMetrics.interactionCount++;

        logInfo(`[KERNEL] Metrics: Eq=${sessionMetrics.equilibriumScore.toFixed(2)}, Overload=${sessionMetrics.overloadIndex.toFixed(2)}, ClarityΔ=${sessionMetrics.clarityDelta.toFixed(2)}`);
    }

    function cognitiveScheduler() {
        if (sessionMetrics.overloadIndex > 0.7) {
            logInfo('[SCHEDULER] CPU Overload. Policy: GROUNDING_REQUIRED');
            return 'PRIORITIZE_GROUNDING';
        }
        if (sessionMetrics.equilibriumScore < 0.4) {
            logInfo('[SCHEDULER] Incoherent State. Policy: STRUCTURE_REQUIRED');
            return 'PRIORITIZE_STRUCTURE';
        }
        return 'IDLE';
    }

    function applyStabilityConstraints(id, newWeight) {
        if (!cognitiveModel) return newWeight;
        const current = cognitiveState[id].weight;
        const constraints = cognitiveModel.kernel.stability_constraints;
        const maxDelta = constraints.max_delta_per_turn;

        let target = newWeight;
        const delta = target - current;

        if (Math.abs(delta) > maxDelta) {
            target = current + (Math.sign(delta) * maxDelta);
        }

        cognitiveState[id].weight = target;
        calculateMetrics();
        return target;
    }

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    function normalizeUpdateNodeArgs(rawArgs) {
        let args = rawArgs;
        if (typeof args === 'string') {
            try {
                args = JSON.parse(args);
            } catch {
                args = {};
            }
        }
        if (!args || typeof args !== 'object') {
            args = {};
        }

        const idCandidate = String(args.id ?? args.node_id ?? args.nodeId ?? '1');
        const id = ['1', '2', '3'].includes(idCandidate) ? idCandidate : '1';

        const currentRadius = Math.round((cognitiveState[id]?.weight ?? 0.6) * 100);
        const numericRadius = Number(args.radius);
        const numericWeight = Number(args.weight);
        const numericDelta = Number(args.expansion ?? args.size);

        let desiredWeight = 0.6;
        if (Number.isFinite(numericRadius)) {
            desiredWeight = clamp(numericRadius / 100, 0.3, 1.0);
        } else if (Number.isFinite(numericWeight)) {
            desiredWeight = clamp(numericWeight, 0.3, 1.0);
        } else if (Number.isFinite(numericDelta)) {
            // Backward compatibility with legacy alias fields.
            desiredWeight = clamp((currentRadius + (numericDelta * 5)) / 100, 0.3, 1.0);
        }

        const stabilizedWeight = applyStabilityConstraints(id, desiredWeight);
        const radius = String(Math.round(stabilizedWeight * 100));

        const colorCandidate = typeof args.color === 'string'
            ? args.color
            : typeof args.colour === 'string'
                ? args.colour
                : cognitiveState[id].color;
        const color = typeof colorCandidate === 'string' && /^#[0-9A-Fa-f]{6}$/.test(colorCandidate)
            ? colorCandidate.toUpperCase()
            : cognitiveState[id].color;

        const fluidity = Number.isFinite(Number(args.fluidity)) ? Number(args.fluidity) : 0.5;

        cognitiveState[id].color = color;
        return { ...args, id, radius, color, fluidity };
    }

    const CIRCLE_NAMES = {
        '1': 'Awareness',
        '2': 'Knowledge',
        '3': 'Truth',
    };

    function buildVisualReason(args, policy, metrics = {}) {
        const id = String(args?.id ?? '1');
        const circleName = CIRCLE_NAMES[id] || 'Awareness';
        const overloadPct = Math.round((Number(metrics.overloadIndex) || 0) * 100);
        const equilibriumPct = Math.round((Number(metrics.equilibriumScore) || 0) * 100);
        const clarityDelta = Number(metrics.clarityDelta) || 0;

        if (typeof args?.reason === 'string' && args.reason.trim()) {
            return args.reason.trim();
        }
        if (policy === 'PRIORITIZE_GROUNDING') {
            return `Grounding ${circleName} because overload is elevated (${overloadPct}%).`;
        }
        if (policy === 'PRIORITIZE_STRUCTURE') {
            return `Rebalancing ${circleName} because coherence dropped (${equilibriumPct}% equilibrium).`;
        }
        if (id === '3' && clarityDelta > 0.08) {
            return 'Reinforcing Truth because clarity is rising in this turn.';
        }
        if (id === '1') {
            return 'Awareness moved first to reflect the current emotional signal.';
        }
        if (id === '2') {
            return 'Knowledge expanded to give the thought more structure.';
        }
        return 'Truth shifted to stabilize the current insight.';
    }

    function annotateVisualArgs(args, policy, metrics = {}) {
        const metric = policy === 'PRIORITIZE_GROUNDING'
            ? 'overload'
            : policy === 'PRIORITIZE_STRUCTURE'
                ? 'equilibrium'
                : String(args?.id ?? '1') === '3' && (Number(metrics.clarityDelta) || 0) > 0
                    ? 'clarity'
                    : 'turn';

        return {
            ...args,
            source: 'agent',
            policy,
            metric,
            reason: buildVisualReason(args, policy, metrics),
        };
    }

    function sanitizeReplayMetrics(rawMetrics = {}) {
        const equilibriumScore = Number(rawMetrics.equilibriumScore);
        const overloadIndex = Number(rawMetrics.overloadIndex);
        const clarityDelta = Number(rawMetrics.clarityDelta);
        const interactionCount = Number(rawMetrics.interactionCount);

        return {
            equilibriumScore: Number.isFinite(equilibriumScore) ? equilibriumScore : Number(sessionMetrics.equilibriumScore || 0),
            overloadIndex: Number.isFinite(overloadIndex) ? overloadIndex : Number(sessionMetrics.overloadIndex || 0),
            clarityDelta: Number.isFinite(clarityDelta) ? clarityDelta : Number(sessionMetrics.clarityDelta || 0),
            interactionCount: Number.isFinite(interactionCount) ? interactionCount : Number(sessionMetrics.interactionCount || 0),
        };
    }

    function sanitizeReplayNodes(rawNodes = []) {
        if (!Array.isArray(rawNodes)) return [];
        return rawNodes
            .map((node) => ({
                id: Number(node?.id),
                radius: Math.round(Number(node?.radius) || 0),
                color: typeof node?.color === 'string' ? node.color : '#00F5FF',
                label: typeof node?.label === 'string' ? node.label : '',
            }))
            .filter((node) => Number.isFinite(node.id) && node.radius > 0)
            .sort((a, b) => a.id - b.id);
    }

    function sanitizeReplaySteps(rawSteps = []) {
        if (!Array.isArray(rawSteps)) return [];
        return rawSteps
            .map((step) => {
                const nodes = sanitizeReplayNodes(step?.nodes);
                if (nodes.length === 0) return null;
                const focusId = Number(step?.focusId);
                return {
                    atMs: Math.max(0, Math.round(Number(step?.atMs) || 0)),
                    kind: typeof step?.kind === 'string' ? step.kind : 'update',
                    focusId: Number.isFinite(focusId) ? focusId : null,
                    reason: typeof step?.reason === 'string' ? step.reason : '',
                    source: typeof step?.source === 'string' ? step.source : 'agent',
                    policy: typeof step?.policy === 'string' ? step.policy : 'IDLE',
                    metric: typeof step?.metric === 'string' ? step.metric : 'turn',
                    nodes,
                    metrics: sanitizeReplayMetrics(step?.metrics),
                };
            })
            .filter(Boolean)
            .slice(-160);
    }

    function encodeReplayArtifact(artifact) {
        if (!artifact) return '';
        try {
            return Buffer.from(JSON.stringify(artifact), 'utf8').toString('base64');
        } catch (error) {
            logError('[Replay] Failed to encode replay artifact:', error);
            return '';
        }
    }

    function flushInputTranscriptBuffer() {
        if (!inputTranscriptBuffer.trim()) return;
        const fullText = inputTranscriptBuffer.trim();
        inputTranscriptBuffer = '';
        logDebug(`[InputBuffer] ${fullText.substring(0, 160)}`);

        // Voice command detection: user says "shrink awareness" etc.
        const cmd = detectCircleCommand(fullText);
        if (cmd) {
            logInfo(`[VoiceCmd] Detected: circle=${cmd.id}, weight=${cmd.weight}, color=${cmd.color}`);
            const stabilizedWeight = applyStabilityConstraints(cmd.id, cmd.weight);
            const radius = Math.round(stabilizedWeight * 100);
            sendToClient({
                toolCall: {
                    functionCalls: [{
                        name: 'update_node',
                        id: `server_cmd_${Date.now()}`,
                        args: { id: cmd.id, radius, color: cmd.color },
                    }],
                },
            });
        }
    }

    const sendToClient = (payload) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(payload));
        }
    };

    const sendServerStatus = (state, extra = {}) => {
        sendToClient({
            serverStatus: {
                state,
                ...extra,
            },
        });
    };

    const sendHybridStatus = (state, extra = {}) => {
        sendToClient({
            hybridStatus: {
                state,
                ...extra,
            },
        });
    };

    const tagSpeaker = (payload, speaker) => ({
        ...payload,
        speaker,
    });

    const clearReconnectCooldown = () => {
        if (reconnectCooldownTimeout) {
            clearTimeout(reconnectCooldownTimeout);
            reconnectCooldownTimeout = null;
        }
    };

    const resetHybridBuffers = () => {
        dawayirHybridTurnBuffer = '';
        userAgentHybridTurnBuffer = '';
        lastHybridTurnBySpeaker = {
            dawayir: '',
            user_agent: '',
        };
        pendingHybridPayloadsBySpeaker = {
            dawayir: [],
            user_agent: [],
        };
    };

    const closeUserAgentSession = async () => {
        userAgentReady = false;
        if (!userAgentSession) {
            if (resolveUserAgentReady) {
                resolveUserAgentReady(false);
                resolveUserAgentReady = null;
            }
            userAgentReadyPromise = null;
            return;
        }
        const sessionToClose = userAgentSession;
        userAgentSession = null;
        try {
            await sessionToClose.close();
        } catch (error) {
            logError('Error closing hybrid user-agent live session:', error);
        } finally {
            if (resolveUserAgentReady) {
                resolveUserAgentReady(false);
                resolveUserAgentReady = null;
            }
            userAgentReadyPromise = null;
        }
    };

    const stopHybridConversation = async (state = 'stopped', extra = {}) => {
        const wasActive = hybridState.active || userAgentSession || userAgentConnecting;
        hybridState = buildInitialHybridState();
        resetHybridBuffers();
        await closeUserAgentSession();
        if (wasActive) {
            sendHybridStatus(state, extra);
        }
    };

    const rememberHybridTurn = (speaker, text) => {
        const historyBucket = hybridState.history?.[speaker];
        if (!Array.isArray(historyBucket)) {
            return;
        }
        historyBucket.push({
            text,
            stage: getHybridStageForSpeaker(speaker, hybridState).key,
            at: Date.now(),
        });
        if (historyBucket.length > 4) {
            historyBucket.shift();
        }
    };

    const bufferHybridSpeakerPayload = (speaker, payload) => {
        if (!payload || !pendingHybridPayloadsBySpeaker[speaker]) {
            return;
        }
        const clonedPayload = JSON.parse(JSON.stringify(payload));
        const serverContent = clonedPayload.serverContent || clonedPayload.server_content;
        if (serverContent) {
            delete serverContent.outputTranscription;
            delete serverContent.output_transcription;
            const modelTurn = serverContent.modelTurn || serverContent.model_turn;
            if (Array.isArray(modelTurn?.parts)) {
                modelTurn.parts = modelTurn.parts.filter((part) => part?.inlineData || part?.inline_data);
            }
        }
        pendingHybridPayloadsBySpeaker[speaker].push(clonedPayload);
    };

    const discardBufferedHybridSpeakerPayloads = (speaker) => {
        if (!pendingHybridPayloadsBySpeaker[speaker]) {
            return;
        }
        pendingHybridPayloadsBySpeaker[speaker] = [];
    };

    const flushBufferedHybridSpeakerPayloads = (speaker, approvedText = '') => {
        if (approvedText) {
            sendToClient({
                debugTranscription: {
                    type: 'output',
                    text: approvedText,
                    finished: true,
                    speaker,
                },
            });
        }

        const pendingPayloads = pendingHybridPayloadsBySpeaker[speaker] || [];
        pendingHybridPayloadsBySpeaker[speaker] = [];
        for (const payload of pendingPayloads) {
            sendToClient(payload);
        }
    };

    const sendOrBufferHybridSpeakerPayload = (speaker, payload) => {
        if (hybridState.active) {
            bufferHybridSpeakerPayload(speaker, payload);
            return;
        }
        sendToClient(payload);
    };

    const getHybridStatusTurn = (speaker) => {
        if (speaker === 'user_agent') {
            return Math.min(hybridState.userTurnCount + 1, hybridState.maxUserTurns);
        }
        return Math.max(1, Math.min(hybridState.userTurnCount || 1, hybridState.maxUserTurns));
    };

    const dispatchPendingHybridDawayirPrompt = () => {
        const promptText = String(hybridState.pendingDawayirPrompt || '').trim();
        if (!promptText || !hybridState.active || hybridState.expectedSpeaker !== 'dawayir' || !session) {
            return;
        }
        const activeSession = session;
        setTimeout(() => {
            if (
                !hybridState.active
                || hybridState.expectedSpeaker !== 'dawayir'
                || !session
                || session !== activeSession
                || String(hybridState.pendingDawayirPrompt || '').trim() !== promptText
            ) {
                return;
            }
            session.sendClientContent({
                turns: [{
                    role: 'user',
                    parts: [{ text: promptText }],
                }],
                turnComplete: true,
            });
        }, HYBRID_HANDOFF_DELAY_MS);
    };

    const dispatchPendingHybridUserAgentPrompt = () => {
        const promptText = String(hybridState.pendingUserAgentPrompt || '').trim();
        const nextTurn = Math.max(1, Number(hybridState.pendingUserAgentTurn || (hybridState.userTurnCount + 1)));
        if (!promptText || !hybridState.active || hybridState.expectedSpeaker !== 'user_agent' || !userAgentSession || !userAgentReady) {
            return;
        }
        const activeSession = userAgentSession;
        setTimeout(() => {
            if (
                !hybridState.active
                || hybridState.expectedSpeaker !== 'user_agent'
                || !userAgentSession
                || !userAgentReady
                || userAgentSession !== activeSession
                || String(hybridState.pendingUserAgentPrompt || '').trim() !== promptText
            ) {
                return;
            }
            userAgentSession.sendClientContent({
                turns: [{
                    role: 'user',
                    parts: [{ text: promptText }],
                }],
                turnComplete: true,
            });
            sendHybridStatus('running', {
                speaker: 'user_agent',
                turn: nextTurn,
                maxTurns: hybridState.maxUserTurns,
            });
        }, HYBRID_HANDOFF_DELAY_MS);
    };

    const requestHybridTurnRepair = (speaker, badText, reasons) => {
        if (!hybridState.active) {
            return false;
        }
        const currentAttempts = hybridState.repairAttempts?.[speaker] || 0;
        if (currentAttempts >= HYBRID_MAX_REPAIR_ATTEMPTS) {
            return false;
        }

        const targetSession = speaker === 'dawayir' ? session : userAgentSession;
        if (!targetSession) {
            return false;
        }

        hybridState.repairAttempts[speaker] = currentAttempts + 1;
        lastHybridTurnBySpeaker[speaker] = '';
        discardBufferedHybridSpeakerPayloads(speaker);

        targetSession.sendClientContent({
            turns: [{
                role: 'user',
                parts: [{
                    text: buildHybridRepairPrompt({
                        speaker,
                        badText,
                        reasons,
                        hybridState,
                    }),
                }],
            }],
            turnComplete: true,
        });

        sendHybridStatus('repairing', {
            speaker,
            turn: getHybridStatusTurn(speaker),
            maxTurns: hybridState.maxUserTurns,
            attempt: hybridState.repairAttempts[speaker],
            message: hybridState.lang === 'ar'
                ? (speaker === 'dawayir'
                    ? 'دواير بيعيد صياغة رده عشان يبقى أوضح.'
                    : 'وكيل المستخدم بيعيد صياغة دوره عشان يبقى أدق.')
                : (speaker === 'dawayir'
                    ? 'Dawayir is tightening the reply.'
                    : 'The user agent is tightening the turn.'),
        });
        return true;
    };

    const forwardUserAgentLineToDawayir = (text) => {
        if (!hybridState.active) {
            return;
        }
        hybridState.expectedSpeaker = 'dawayir';
        hybridState.pendingDawayirPrompt = buildHybridDawayirTurnPrompt(text, hybridState);
        dispatchPendingHybridDawayirPrompt();
    };

    const forwardDawayirLineToUserAgent = (text) => {
        if (!hybridState.active) {
            return;
        }
        hybridState.expectedSpeaker = 'user_agent';
        const nextTurn = hybridState.userTurnCount + 1;
        hybridState.pendingDawayirOpening = text;
        hybridState.pendingUserAgentTurn = nextTurn;
        hybridState.pendingUserAgentPrompt = buildHybridUserAgentTurnPrompt(
            text,
            hybridState.lang,
            nextTurn,
            hybridState.maxUserTurns,
            hybridState
        );
        dispatchPendingHybridUserAgentPrompt();
    };

    const handleHybridCompletedTurn = async (speaker, rawText) => {
        if (!hybridState.active) {
            return;
        }

        const text = cleanHybridTurnText(rawText);
        if (!text || lastHybridTurnBySpeaker[speaker] === text) {
            return;
        }
        if (hybridState.expectedSpeaker && hybridState.expectedSpeaker !== speaker) {
            return;
        }

        const quality = assessHybridTurnQuality({
            speaker,
            text,
            hybridState,
        });
        if (!quality.ok) {
            const didRequestRepair = requestHybridTurnRepair(speaker, text, quality.reasons);
            if (didRequestRepair) {
                return;
            }
            logInfo(`[Hybrid] Accepting ${speaker} turn after repair limit: ${quality.reasons.join(' | ')}`);
        }

        lastHybridTurnBySpeaker[speaker] = text;
        hybridState.repairAttempts[speaker] = 0;
        rememberHybridTurn(speaker, text);
        flushBufferedHybridSpeakerPayloads(speaker, text);

        if (speaker === 'dawayir') {
            hybridState.pendingDawayirPrompt = '';
            if (hybridState.awaitingFinalDawayirTurn) {
                await stopHybridConversation('completed', {
                    turn: hybridState.userTurnCount,
                    maxTurns: hybridState.maxUserTurns,
                });
                return;
            }
            forwardDawayirLineToUserAgent(text);
            return;
        }

        if (speaker !== 'user_agent') {
            return;
        }

        hybridState.userTurnCount += 1;
        hybridState.pendingUserAgentPrompt = '';
        hybridState.pendingUserAgentTurn = 0;
        if (hybridState.userTurnCount >= hybridState.maxUserTurns) {
            hybridState.awaitingFinalDawayirTurn = true;
        }
        sendHybridStatus('running', {
            speaker: 'dawayir',
            turn: hybridState.userTurnCount,
            maxTurns: hybridState.maxUserTurns,
        });
        forwardUserAgentLineToDawayir(text);
    };

    const ensureUserAgentSession = async (lang = 'ar') => {
        if (userAgentSession && userAgentReady && userAgentLang === lang) {
            return true;
        }
        if (userAgentReadyPromise) {
            return userAgentReadyPromise;
        }

        if (userAgentSession && userAgentLang !== lang) {
            await closeUserAgentSession();
        }

        userAgentConnecting = true;
        userAgentReady = false;
        userAgentLang = lang === 'en' ? 'en' : 'ar';
        userAgentReadyPromise = new Promise((resolve) => {
            resolveUserAgentReady = resolve;
        });

        try {
            const liveSession = await ai.live.connect({
                model: pickLiveModel(),
                config: {
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                voiceName: LIVE_USER_AGENT_VOICE,
                            },
                        },
                    },
                    responseModalities: ['AUDIO'],
                    maxOutputTokens: HYBRID_USER_AGENT_MAX_OUTPUT_TOKENS,
                    thinkingConfig: { thinkingBudget: 0 },
                    systemInstruction: buildHybridUserAgentInstruction(userAgentLang),
                    outputAudioTranscription: {},
                },
                callbacks: {
                    onopen: () => {
                        logInfo(`Hybrid user-agent session connected (${activeLiveModel})`);
                    },
                    onmessage: (message) => {
                        const payload = toCompatMessage(message);
                        if (payload.setupComplete || payload.setup_complete) {
                            userAgentReady = true;
                            if (resolveUserAgentReady) {
                                resolveUserAgentReady(true);
                                resolveUserAgentReady = null;
                            }
                            sendHybridStatus('ready', {
                                maxTurns: hybridState.maxUserTurns,
                            });
                            dispatchPendingHybridUserAgentPrompt();
                            return;
                        }

                        const serverContent = payload.serverContent || payload.server_content;
                        const outTx = serverContent?.outputTranscription || serverContent?.output_transcription;
                        if (outTx?.text) {
                            if (!hybridState.active) {
                                sendToClient({
                                    debugTranscription: {
                                        type: 'output',
                                        text: outTx.text,
                                        finished: outTx.finished,
                                        speaker: 'user_agent',
                                    },
                                });
                            }
                            userAgentHybridTurnBuffer = `${userAgentHybridTurnBuffer} ${outTx.text}`.trim();
                            if (outTx.finished) {
                                const completedText = userAgentHybridTurnBuffer;
                                userAgentHybridTurnBuffer = '';
                                void handleHybridCompletedTurn('user_agent', completedText);
                            }
                        }

                        const outputTurnComplete = Boolean(
                            serverContent?.turnComplete
                            || serverContent?.turn_complete
                            || serverContent?.generationComplete
                            || serverContent?.generation_complete
                        );
                        if (outputTurnComplete && userAgentHybridTurnBuffer.trim()) {
                            const completedText = userAgentHybridTurnBuffer;
                            userAgentHybridTurnBuffer = '';
                            void handleHybridCompletedTurn('user_agent', completedText);
                        }

                        const taggedPayload = tagSpeaker(payload, 'user_agent');
                        sendOrBufferHybridSpeakerPayload('user_agent', taggedPayload);
                    },
                    onerror: (error) => {
                        logError('Hybrid user-agent live session error:', error);
                    },
                    onclose: () => {
                        userAgentSession = null;
                        userAgentReady = false;
                        if (resolveUserAgentReady) {
                            resolveUserAgentReady(false);
                            resolveUserAgentReady = null;
                        }
                        userAgentReadyPromise = null;
                        if (hybridState.active && !clientClosed) {
                            sendHybridStatus('recovering', {
                                message: hybridState.lang === 'ar'
                                    ? 'وكيل المستخدم وقع لحظة، وبنرجّعه دلوقتي.'
                                    : 'The live user agent dropped for a moment and is recovering now.',
                            });
                            void ensureUserAgentSession(hybridState.lang).then((ready) => {
                                if (!ready && hybridState.active && !clientClosed) {
                                    void stopHybridConversation('failed', {
                                        message: hybridState.lang === 'ar'
                                            ? 'جلسة وكيل المستخدم الحي وقفت قبل ما الديمو يكمّل.'
                                            : 'The live user-agent session dropped before the demo could finish.',
                                    });
                                }
                            });
                        }
                    },
                },
            });

            userAgentSession = liveSession;
            return userAgentReadyPromise;
        } catch (error) {
            logError('Failed to initialize hybrid user-agent session:', error);
            if (resolveUserAgentReady) {
                resolveUserAgentReady(false);
                resolveUserAgentReady = null;
            }
            userAgentReadyPromise = null;
            return false;
        } finally {
            userAgentConnecting = false;
        }
    };

    const processHybridControl = async (hybridControl) => {
        const action = String(hybridControl?.action || '').toLowerCase();
        if (action === 'stop') {
            await stopHybridConversation('stopped');
            return;
        }

        if (action !== 'start') {
            return;
        }

        // ── SERVER-SIDE DEMO AUTHORIZATION ───────────────────────────
        // Allow hybrid only for connections that presented a valid DEMO_TOKEN.
        // This lets the demo button work while keeping live sessions clean.
        if (!clientIsAuthorizedForDemo) {
            logInfo('[Hybrid] BLOCKED: hybrid start refused — no valid demoToken');
            sendHybridStatus('failed', {
                message: 'Hybrid demo requires a valid demo token.',
            });
            return;
        }

        if (!session) {
            sendHybridStatus('failed', {
                message: 'Primary Dawayir session is not ready yet.',
            });
            return;
        }

        if (hybridState.active) {
            await stopHybridConversation('stopped');
        }

        const lang = hybridControl?.lang === 'en' ? 'en' : 'ar';
        const requestedTurns = Number(hybridControl?.maxTurns);
        const maxUserTurns = Number.isFinite(requestedTurns)
            ? Math.max(2, Math.min(8, Math.round(requestedTurns)))
            : HYBRID_MAX_USER_TURNS;

        hybridState = {
            ...buildInitialHybridState(),
            active: true,
            lang,
            maxUserTurns,
            expectedSpeaker: 'dawayir',
        };
        resetHybridBuffers();
        sendHybridStatus('starting', {
            maxTurns: maxUserTurns,
        });

        const ready = await ensureUserAgentSession(lang);
        if (!ready && hybridState.active) {
            await stopHybridConversation('failed', {
                message: lang === 'ar'
                    ? 'تعذر فتح جلسة وكيل المستخدم الحي.'
                    : 'Failed to open the live user-agent session.',
            });
            return;
        }

        if (hybridState.active) {
            sendHybridStatus('waiting_opening', {
                maxTurns: hybridState.maxUserTurns,
            });
        }
    };

    const queueClientMessage = (message) => {
        if (!message || typeof message !== 'object') {
            return;
        }

        const realtimeInput = message.realtimeInput ?? message.realtime_input;
        if (isAudioOnlyRealtimeInput(realtimeInput)) {
            // Audio is high-frequency and becomes stale during reconnect windows.
            return;
        }

        if (pendingClientMessages.length >= MAX_PENDING_CLIENT_MESSAGES) {
            pendingClientMessages.shift();
        }
        pendingClientMessages.push(message);
    };

    const flushPendingMessages = () => {
        if (!session || pendingClientMessages.length === 0) {
            return;
        }

        while (pendingClientMessages.length > 0) {
            const message = pendingClientMessages.shift();
            try {
                processClientMessage(message);
            } catch (error) {
                logError('Failed to process queued client message:', error);
            }
        }
    };

    const processRealtimeInput = (realtimeInput) => {
        if (!session || !realtimeInput || typeof realtimeInput !== 'object') {
            return;
        }

        const mediaChunks = Array.isArray(realtimeInput.mediaChunks)
            ? realtimeInput.mediaChunks
            : Array.isArray(realtimeInput.media_chunks)
                ? realtimeInput.media_chunks
                : [];
        for (const chunk of mediaChunks) {
            const blob = toBlobFromChunk(chunk);
            if (!blob) {
                continue;
            }

            if (blob.mimeType.startsWith('audio/')) {
                audioChunkCount += 1;
                if (audioChunkCount === 1 || audioChunkCount % 100 === 0) {
                    logInfo(`Client audio chunks received: ${audioChunkCount} (mime: ${blob.mimeType})`);
                }
                session.sendRealtimeInput({ media: blob });
            } else {
                session.sendRealtimeInput({ media: blob });
            }
        }

        const audioStreamEnd = Boolean(realtimeInput.audioStreamEnd ?? realtimeInput.audio_stream_end);
        if (audioStreamEnd) {
            session.sendRealtimeInput({ audioStreamEnd: true });
        }

        if (typeof realtimeInput.text === 'string' && realtimeInput.text.trim().length > 0) {
            session.sendRealtimeInput({ text: realtimeInput.text });
        }
    };

    const processClientContent = (clientContent) => {
        logInfo('Client content turn received:', JSON.stringify(clientContent).substring(0, 200));
        // Agent-only visual control: user text is forwarded as-is to Gemini.
        session.sendClientContent(clientContent);
    };

    const processToolResponse = (toolResponse) => {
        logDebug('Client tool response received');

        // Filter out visual tool responses — they were already resolved server-side
        const responses = toolResponse.functionResponses || toolResponse.function_responses || [];
        const visualToolPrefixes = ['gemini_visual_', 'server_cmd_', 'text_cmd_', 'client_cmd_'];
        const filteredResponses = responses.filter(resp => {
            const id = resp.id || '';
            return !visualToolPrefixes.some(prefix => id.startsWith(prefix));
        });
        if (filteredResponses.length === 0) {
            logInfo('[FILTER] All tool responses were visual — not forwarding to Gemini');
            return;
        }
        // Update the tool response with only non-visual responses
        if (filteredResponses.length < responses.length) {
            toolResponse.functionResponses = filteredResponses;
            toolResponse.function_responses = filteredResponses;
            logInfo(`[FILTER] Filtered ${responses.length - filteredResponses.length} visual tool response(s)`);
        }

        // Intercept save_mental_map for GCS upload
        for (const resp of filteredResponses) {
            if (resp.name === 'save_mental_map' && resp.response?.result?.ok) {
                const nodes = sanitizeReplayNodes(resp.response.result.nodes);
                const replaySteps = sanitizeReplaySteps(resp.response.result.replayTrace);
                const replayMetrics = sanitizeReplayMetrics(resp.response.result.metrics);

                if (nodes.length > 0) {
                    const timestampVal = Date.now();
                    const filename = `mental_map_${timestampVal}.json`;
                    const artifact = {
                        version: 1,
                        savedAt: new Date(timestampVal).toISOString(),
                        metrics: replayMetrics,
                        finalNodes: nodes,
                        steps: replaySteps.length > 0 ? replaySteps : [{
                            atMs: 0,
                            kind: 'snapshot',
                            focusId: null,
                            reason: 'Final canvas snapshot',
                            source: 'system',
                            policy: 'IDLE',
                            metric: 'turn',
                            nodes,
                            metrics: replayMetrics,
                        }],
                    };

                    sessionArtifacts.latestReplay = artifact;
                    sessionArtifacts.latestReplayFilename = filename;

                    try {
                        const localPath = path.join(LOCAL_REPORTS_DIR, filename);
                        fs.writeFileSync(localPath, JSON.stringify(artifact, null, 2));
                        logInfo(`[STORAGE] Mental map saved locally: ${filename}`);
                    } catch (err) {
                        logError('[STORAGE] Mental map local write failed:', err);
                    }

                    if (BUCKET_NAME) {
                        logInfo(`Uploading mental map to GCS: ${filename}`);
                        const file = storage.bucket(BUCKET_NAME).file(filename);
                        file.save(JSON.stringify(artifact, null, 2), {
                            contentType: 'application/json',
                        }).then(() => {
                            logInfo('GCS Upload Successful');
                        }).catch(err => {
                            logError('GCS Upload Failed:', err);
                        });
                    }
                }
            }

            if (resp.name === 'generate_session_report' && resp.response?.result?.ok) {
                const { summary, insights, recommendations } = resp.response.result;
                const timestampVal = Date.now();
                const filename = `session_report_${timestampVal}.md`;
                const replayStepsCount = sessionArtifacts.latestReplay?.steps?.length || 0;
                const replayBlob = encodeReplayArtifact(sessionArtifacts.latestReplay);
                const replayComment = replayBlob ? `\n<!-- DAWAYIR_REPLAY:${replayBlob} -->` : '';
                const replayEvidence = replayStepsCount > 0
                    ? `\n## Replay Trace\n${replayStepsCount} visual state transition(s) captured for session replay.\n`
                    : '';

                const content = `
# Dawayir Session Report
**Date:** ${new Date().toLocaleString()}
**ID:** ${timestampVal}

## Executive Summary
${summary}

## Core Insights
${insights}

## Recommendations
${recommendations || "N/A"}
${replayEvidence}

---
*Generated by Dawayir Live Agent (Gemini 2.0)*
${replayComment}
                `;

                // 1. Save Locally
                try {
                    const localPath = path.join(LOCAL_REPORTS_DIR, filename);
                    fs.writeFileSync(localPath, content);
                    logInfo(`[STORAGE] Report saved locally: ${filename}`);
                } catch (err) {
                    logError('[STORAGE] Local write failed:', err);
                }

                // 2. Save to GCS
                if (BUCKET_NAME) {
                    logInfo(`[STORAGE] Uploading session report to GCS: ${filename}`);
                    const file = storage.bucket(BUCKET_NAME).file(filename);
                    file.save(content, {
                        contentType: 'text/markdown',
                    }).then(() => {
                        logInfo('[STORAGE] GCS Report Upload Successful');
                    }).catch(err => {
                        logError('[STORAGE] GCS Report Upload Failed:', err);
                    });
                }
            }
        }

        // Fallback for tools the client handles visually (update_node, highlight_node)
        session.sendToolResponse(toolResponse);
    };

    const processClientMessage = (message) => {
        const hybridControl = message?.hybridControl ?? message?.hybrid_control;
        if (hybridControl) {
            void processHybridControl(hybridControl);
            const hasPassthroughPayload = Boolean(
                message?.realtimeInput
                || message?.realtime_input
                || message?.clientContent
                || message?.client_content
                || message?.toolResponse
                || message?.tool_response
            );
            if (!hasPassthroughPayload) {
                return;
            }
        }

        if (!session) {
            queueClientMessage(message);
            return;
        }

        const realtimeInput = message.realtimeInput ?? message.realtime_input;
        const clientContent = message.clientContent ?? message.client_content;
        const toolResponse = message.toolResponse ?? message.tool_response;

        if (realtimeInput) {
            processRealtimeInput(realtimeInput);
        }

        if (clientContent) {
            processClientContent(clientContent);
        }

        if (toolResponse) {
            processToolResponse(toolResponse);
        }
    };

    const scheduleReconnect = async (reason = 'unknown') => {
        if (clientClosed || reconnectInProgress) {
            return;
        }
        clearReconnectCooldown();
        reconnectInProgress = true;

        while (!clientClosed && !session && reconnectAttempt < GEMINI_RECONNECT_MAX_ATTEMPTS) {
            reconnectAttempt += 1;
            activeLiveModel = pickLiveModel(reconnectAttempt);
            const delayMs = Math.min(
                GEMINI_RECONNECT_BASE_DELAY_MS * (2 ** (reconnectAttempt - 1)),
                GEMINI_RECONNECT_MAX_DELAY_MS
            );

            logInfo(`Gemini reconnect scheduled (#${reconnectAttempt}/${GEMINI_RECONNECT_MAX_ATTEMPTS}) after ${delayMs}ms. reason=${reason}`);
            sendServerStatus('gemini_reconnecting', {
                attempt: reconnectAttempt,
                maxAttempts: GEMINI_RECONNECT_MAX_ATTEMPTS,
                delayMs,
            });

            await sleep(delayMs);
            if (clientClosed || session) {
                break;
            }

            await connectLiveSession();
        }

        reconnectInProgress = false;

        if (!clientClosed && !session) {
            logError(`Gemini reconnect attempts exhausted. Cooling down for ${GEMINI_RECOVERY_COOLDOWN_MS}ms.`);
            sendServerStatus('gemini_unavailable', {
                maxAttempts: GEMINI_RECONNECT_MAX_ATTEMPTS,
                cooldownMs: GEMINI_RECOVERY_COOLDOWN_MS,
            });
            reconnectAttempt = 0;
            clearReconnectCooldown();
            reconnectCooldownTimeout = setTimeout(() => {
                reconnectCooldownTimeout = null;
                if (!clientClosed && !session) {
                    void scheduleReconnect('cooldown_retry');
                }
            }, GEMINI_RECOVERY_COOLDOWN_MS);
        }
    };

    const connectLiveSession = async () => {
        if (clientClosed || session || connectingSession) {
            return;
        }
        connectingSession = true;

        activeLiveModel = pickLiveModel(reconnectAttempt);
        // Use hybrid lean mode only for connections that presented a valid DEMO_TOKEN
        const useHybridLeanMode = clientIsAuthorizedForDemo && (hybridState.active || isHybridSessionRequested);

        let currentSystemInstruction = {
            parts: [{ text: useHybridLeanMode ? systemInstructionDemo : systemInstructionStandard }]
        };

        if (isFirstSession && !useHybridLeanMode) {
            logInfo('First session detected via query parameter. Injecting welcome prompt.');
            const welcomePrompt = `\n\n[GUIDANCE OVERRIDE - FIRST SESSION]
المستخدم يفتح التطبيق لأول مرة. كُن "المرآة الإدراكية". رحب به بلطف شديد (أقل من 15 كلمة).
قل شيئاً مثل: "أهلاً بيك في دواير... أنا هنا عشان أسمعك، تحب تبدأ بإيه؟"`;
            currentSystemInstruction = {
                parts: [{ text: currentSystemInstruction.parts[0].text + welcomePrompt }]
            };
        }

        try {
            const useRecoveryLeanMode = hybridState.active && reconnectAttempt > 0;
            const selectedDawayirTools = useHybridLeanMode ? hybridDawayirTools : defaultDawayirTools;
            const selectedMaxOutputTokens = useRecoveryLeanMode
                ? HYBRID_DAWAYIR_RECOVERY_MAX_OUTPUT_TOKENS
                : (useHybridLeanMode
                    ? HYBRID_DAWAYIR_MAX_OUTPUT_TOKENS
                    : (clientIsAuthorizedForDemo ? 90 : 350));
            logInfo(
                `[LiveConfig] hybrid=${useHybridLeanMode} recovery=${useRecoveryLeanMode} tools=${selectedDawayirTools[0]?.functionDeclarations?.map((tool) => tool.name).join(',') || 'none'} maxOutputTokens=${selectedMaxOutputTokens}`
            );
            const liveSession = await ai.live.connect({
                model: activeLiveModel,
                config: {
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                voiceName: LIVE_DAWAYIR_VOICE,
                            }
                        }
                    },
                    responseModalities: ["AUDIO"],
                    maxOutputTokens: selectedMaxOutputTokens,
                    thinkingConfig: { thinkingBudget: 0 },

                    tools: selectedDawayirTools,
                    systemInstruction: currentSystemInstruction,
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
                callbacks: {
                    onopen: () => {
                        logInfo(`Connected to Gemini Live API via Google GenAI SDK (${activeLiveModel})`);
                    },
                    onmessage: (message) => {
                        const wasRecovering = reconnectAttempt > 0;
                        const payload = toCompatMessage(message);
                        const isSetupPayload = Boolean(payload.setupComplete || payload.setup_complete);
                        if (wasRecovering && !isSetupPayload) {
                            reconnectAttempt = 0;
                            sendServerStatus('gemini_recovered');
                        }
                        serverMessageCount += 1;
                        if ((payload.setupComplete || payload.setup_complete) && hybridState.active && wasRecovering) {
                            dispatchPendingHybridDawayirPrompt();
                        }

                        // Always log first 200 chars to debug no-response issue
                        const payloadStr = JSON.stringify(payload);
                        logInfo(`Gemini msg #${serverMessageCount} (${payloadStr.length} bytes): ${payloadStr.substring(0, 200)}`);

                        // ---- Diagnostic: log serverContent sub-keys ----
                        const sc = payload.serverContent || payload.server_content;
                        if (sc) {
                            const scKeys = Object.keys(sc).filter(k => sc[k] != null);
                            if (scKeys.length > 0 && !scKeys.every(k => k === 'modelTurn' || k === 'model_turn')) {
                                logInfo(`[SC:keys] ${scKeys.join(', ')}`);
                            }

                            // ---- Transcription-based command detection (fallback) ----
                            const inTx = sc.inputTranscription || sc.input_transcription;
                            if (inTx?.text) {
                                logInfo(`[Transcription:in] "${inTx.text}" (finished=${inTx.finished})`);
                                // On each client message, update the scheduler state
                                const scheduleHint = cognitiveScheduler();
                                if (scheduleHint !== 'IDLE') {
                                    logInfo(`[SCHEDULER] Injecting prompt hint: ${scheduleHint}`);
                                    // Optionally forward hint to model via serverContent but for now just log it
                                }

                                sendToClient({
                                    debugTranscription: {
                                        type: 'input',
                                        text: inTx.text,
                                        finished: inTx.finished,
                                        metrics: sessionMetrics,
                                        speaker: 'user',
                                    },
                                });
                                // Accumulate fragments instead of processing each one
                                inputTranscriptBuffer += inTx.text;
                                // Reset the flush timer on each new fragment
                                if (inputTranscriptTimer) clearTimeout(inputTranscriptTimer);
                                if (inTx.finished) {
                                    // Sentence complete — flush immediately
                                    flushInputTranscriptBuffer();
                                } else {
                                    // Set a timeout to flush after silence
                                    inputTranscriptTimer = setTimeout(flushInputTranscriptBuffer, INPUT_TRANSCRIPT_FLUSH_MS);
                                }
                            }
                            const outTx = sc.outputTranscription || sc.output_transcription;
                            // When Gemini starts responding, user has stopped talking — flush input buffer
                            if (outTx?.text && inputTranscriptBuffer.trim()) {
                                if (inputTranscriptTimer) clearTimeout(inputTranscriptTimer);
                                flushInputTranscriptBuffer();
                            }
                            if (outTx?.text) {
                                logInfo(`[Transcription:out] "${outTx.text}" (finished=${outTx.finished})`);
                                if (!hybridState.active) {
                                    sendToClient({
                                        debugTranscription: {
                                            type: 'output',
                                            text: outTx.text,
                                            finished: outTx.finished,
                                            speaker: 'dawayir',
                                        },
                                    });
                                }

                                dawayirHybridTurnBuffer = `${dawayirHybridTurnBuffer} ${outTx.text}`.trim();
                                if (outTx.finished) {
                                    const completedDawayirTurn = dawayirHybridTurnBuffer;
                                    dawayirHybridTurnBuffer = '';
                                    void handleHybridCompletedTurn('dawayir', completedDawayirTurn);
                                }

                                // Accumulate for sentiment analysis
                                outputSentimentBuffer += ' ' + outTx.text;
                                if (outputSentimentTimer) clearTimeout(outputSentimentTimer);
                                if (outTx.finished) {
                                    flushOutputSentimentBuffer();
                                } else {
                                    outputSentimentTimer = setTimeout(flushOutputSentimentBuffer, 3000);
                                }
                            }

                            const outputTurnComplete = Boolean(
                                sc.turnComplete
                                || sc.turn_complete
                                || sc.generationComplete
                                || sc.generation_complete
                            );
                            if (outputTurnComplete && dawayirHybridTurnBuffer.trim()) {
                                const completedDawayirTurn = dawayirHybridTurnBuffer;
                                dawayirHybridTurnBuffer = '';
                                void handleHybridCompletedTurn('dawayir', completedDawayirTurn);
                            }
                        }

                        // Intercept server-side tool calls before forwarding.
                        // Important: don't drop non-tool payload content.
                        const toolCall = payload.toolCall || payload.tool_call;
                        if (toolCall) {
                            const functionCalls = toolCall.functionCalls || toolCall.function_calls || [];
                            const serverTools = ['get_expert_insight'];
                            const visualTools = ['update_node', 'highlight_node', 'update_journey'];
                            const clientTools = functionCalls.filter(fc => !serverTools.includes(fc.name) && !visualTools.includes(fc.name));
                            const serverOnlyTools = functionCalls.filter(fc => serverTools.includes(fc.name));
                            const visualOnlyTools = functionCalls.filter(fc => visualTools.includes(fc.name));

                            // Resolve server-side tools immediately
                            if (serverOnlyTools.length > 0) {
                                resolveServerToolCalls(serverOnlyTools, session, sessionMetrics);
                            }

                            if (visualOnlyTools.length > 0) {
                                const activePolicy = cognitiveScheduler();
                                const processedVisualTools = visualOnlyTools.map((fc, index) => {
                                    const visualId = `gemini_visual_${fc.id || Date.now()}_${index}`;
                                    if (fc.name === 'update_node') {
                                        const normalizedArgs = normalizeUpdateNodeArgs(fc.args);
                                        return {
                                            ...fc,
                                            id: visualId,
                                            args: annotateVisualArgs(normalizedArgs, activePolicy, sessionMetrics),
                                        };
                                    }
                                    return {
                                        ...fc,
                                        id: visualId,
                                    };
                                });

                                sendOrBufferHybridSpeakerPayload('dawayir', {
                                    toolCall: {
                                        functionCalls: processedVisualTools,
                                    },
                                    cognitiveMetrics: sessionMetrics,
                                    speaker: 'dawayir',
                                });

                                const visualResponses = visualOnlyTools.map(fc => ({
                                    id: fc.id,
                                    name: fc.name,
                                    response: { result: { ok: true } },
                                }));

                                try {
                                    session.sendToolResponse({ functionResponses: visualResponses });
                                    logInfo(`[VISUAL] Resolved ${visualOnlyTools.length} visual tool(s) server-side`);
                                } catch (err) {
                                    logError('[VISUAL] Failed to send tool response:', err);
                                }
                            }

                            // Forward remaining client tools
                            const payloadWithoutTools = { ...payload };
                            delete payloadWithoutTools.toolCall;
                            delete payloadWithoutTools.tool_call;
                            const hasNonToolPayload = Object.keys(payloadWithoutTools).length > 0;

                            if (clientTools.length > 0) {
                                const clientPayload = tagSpeaker({ ...payload }, 'dawayir');
                                const clientToolCall = { ...(clientPayload.toolCall || clientPayload.tool_call) };
                                clientToolCall.functionCalls = clientTools;
                                clientToolCall.function_calls = clientTools;
                                clientPayload.toolCall = clientToolCall;
                                clientPayload.tool_call = clientToolCall;
                                sendOrBufferHybridSpeakerPayload('dawayir', clientPayload);
                            } else if (hasNonToolPayload) {
                                sendOrBufferHybridSpeakerPayload('dawayir', tagSpeaker(payloadWithoutTools, 'dawayir'));
                            }
                            return;
                        }
                        // Check for model audio to log
                        const modelTurn = sc?.modelTurn || sc?.model_turn;
                        const parts = modelTurn?.parts || [];
                        const audioParts = parts.filter(p => p.inlineData || p.inline_data);
                        if (audioParts.length > 0) {
                            logInfo(`[Audio] Received ${audioParts.length} audio chunk(s) from Gemini`);
                        }

                        sendOrBufferHybridSpeakerPayload('dawayir', tagSpeaker(payload, 'dawayir'));

                    },
                    onerror: (error) => {
                        logError('Gemini Live session error:', error);
                    },
                    onclose: (event) => {
                        logInfo(`Gemini Live session closed. code=${event?.code ?? 'n/a'} reason=${String(event?.reason ?? '')}`);
                        session = null;
                        if (hybridState.active) {
                            sendHybridStatus('recovering', {
                                message: hybridState.lang === 'ar'
                                    ? 'جلسة دواير الحية وقعت لحظة، وبنرجّعها دلوقتي.'
                                    : 'The Dawayir live session dropped for a moment and is recovering now.',
                            });
                        }

                        if (!clientClosed) {
                            void scheduleReconnect(`onclose:${event?.code ?? 'n/a'}`);
                        }
                    },
                },
            });

            session = liveSession;
            clearReconnectCooldown();
            if (clientClosed && session) {
                session.close();
                session = null;
                return;
            }

            flushPendingMessages();
        } catch (error) {
            logError('Failed to initialize Gemini Live session via SDK:', error);
            if (!clientClosed) {
                session = null;
                void scheduleReconnect('connect_exception');
            }
        } finally {
            connectingSession = false;
        }
    };

    void connectLiveSession();

    ws.on('message', (data, isBinary) => {
        if (isBinary) {
            logDebug('Ignoring unexpected binary frame from client.');
            return;
        }

        try {
            const message = JSON.parse(data.toString());
            processClientMessage(message);
        } catch (error) {
            logDebug('Ignoring non-JSON client frame.');
            if (isDebug) {
                logDebug(error);
            }
        }
    });

    ws.on('close', () => {
        clientClosed = true;
        logInfo('Client disconnected');
        clearReconnectCooldown();
        void closeUserAgentSession();
        if (session) {
            try {
                session.close();
            } catch (error) {
                logError('Error closing Gemini Live session:', error);
            }
        }
    });
});

// ---- Server-side Tool Resolution Handlers ----

const handleGetExpertInsight = (call, args) => {
    const topic = (args.topic || '').toLowerCase().trim();
    logInfo(`[Grounding] get_expert_insight called for topic: "${topic}"`);

    if (!knowledgeBase) {
        throw new Error('Knowledge base not loaded');
    }

    const principle = knowledgeBase.principles.find(p =>
        p.id === topic ||
        p.concept.toLowerCase().includes(topic) ||
        p.description.toLowerCase().includes(topic)
    );

    if (principle) {
        logInfo(`[Grounding] Found principle: ${principle.concept}`);
        return {
            id: call.id,
            name: call.name,
            response: {
                result: {
                    ok: true,
                    platform: knowledgeBase.platform_name,
                    concept: principle.concept,
                    description: principle.description,
                    guideline: principle.guideline,
                    persona_rules: knowledgeBase.agent_persona_rules
                }
            }
        };
    } else {
        logInfo(`[Grounding] No exact match for "${topic}", returning full framework`);
        return {
            id: call.id,
            name: call.name,
            response: {
                result: {
                    ok: true,
                    platform: knowledgeBase.platform_name,
                    philosophy: knowledgeBase.core_philosophy,
                    all_principles: knowledgeBase.principles.map(p => ({
                        concept: p.concept,
                        description: p.description,
                        guideline: p.guideline
                    })),
                    tone_system: knowledgeBase.tone_system,
                    orbital_dictionary: knowledgeBase.orbital_dictionary,
                    success_stories: knowledgeBase.success_stories,
                    emergency_protocol: knowledgeBase.emergency_protocol,
                    dawayir_model: knowledgeBase.dawayir_circle_model,
                    persona_rules: knowledgeBase.agent_persona_rules
                }
            }
        };
    }
};

const handleSaveMentalMap = (call, args) => {
    const sessionName = args.session_name || `session_${Date.now()}`;
    logInfo(`[Memory] save_mental_map called: ${sessionName}`);
    return {
        id: call.id,
        name: call.name,
        response: { result: { ok: true, saved_as: sessionName } }
    };
};

const handleGenerateSessionReport = (call, args, metrics = {}) => {
    const { summary, insights, recommendations } = args;
    logInfo(`[Memory] generate_session_report called`);

    const evidence = `
### Cognitive OS Performance Metrics (Evidence)
- **Final Equilibrium Score:** ${(metrics.equilibriumScore * 100 || 0).toFixed(1)}%
- **Session Clarity Delta:** ${((metrics.clarityDelta || 0) * 100).toFixed(1)}%
- **Peak Overload Index:** ${(metrics.overloadIndex * 100 || 0).toFixed(1)}%
- **Total Operational Cycles:** ${metrics.interactionCount || 0}
`;

    if (BUCKET_NAME) {
        const filename = `session_report_${Date.now()}.md`;
        const reportContent = `# Dawayir Session Report
**Date:** ${new Date().toLocaleString()}

## Executive Summary
${summary || 'N/A'}

## Core Insights
${insights || 'N/A'}

${evidence}

## Recommendations
${recommendations || 'N/A'}

---
*Generated by Dawayir Cognitive Kernel (Gemini 2.0 Flash)*`;

        const file = storage.bucket(BUCKET_NAME).file(filename);
        file.save(reportContent, { contentType: 'text/markdown' })
            .then(() => logInfo(`GCS Report Upload Successful: ${filename}`))
            .catch(err => logError('GCS Report Upload Failed:', err));
    }

    return {
        id: call.id,
        name: call.name,
        response: { result: { ok: true, summary, insights, recommendations, metrics, timestamp: new Date().toISOString() } }
    };
};

// ---- Server-side Tool Resolution ----
const resolveServerToolCalls = (functionCalls, liveSession, metrics = {}) => {
    if (!liveSession || functionCalls.length === 0) return;

    const responses = [];

    for (const call of functionCalls) {
        let args = call?.args ?? {};
        if (typeof args === 'string') {
            try { args = JSON.parse(args); } catch { args = {}; }
        }

        try {
            switch (call.name) {
                case 'get_expert_insight':
                    responses.push(handleGetExpertInsight(call, args));
                    break;
                case 'save_mental_map':
                    responses.push(handleSaveMentalMap(call, args));
                    break;
                case 'generate_session_report':
                    responses.push(handleGenerateSessionReport(call, args, metrics));
                    break;
                default:
                    // Should not happen for server-side tools unless unhandled tool
                    logInfo(`[Tool] Unhandled server-side tool: ${call.name}`);
                    break;
            }
        } catch (error) {
            logError(`[Tool] Server-side tool error (${call.name}):`, error);
            responses.push({
                id: call.id,
                name: call.name,
                response: { result: { ok: false, error: error.message } }
            });
        }
    }

    if (responses.length > 0) {
        logInfo(`[Tool] Sending ${responses.length} server-resolved tool response(s) to Gemini`);
        liveSession.sendToolResponse({ functionResponses: responses });
    }
};

app.get('/health', (req, res) => res.send('OK'));

// Serve static files from the React app
const clientDistCandidates = [
    path.join(__dirname, 'client/dist'),
    path.join(__dirname, '../client/dist'),
];
const clientDistPath = clientDistCandidates.find((candidate) => fs.existsSync(candidate));

if (clientDistPath) {
    app.use(express.static(clientDistPath));
}

// Catch-all to serve index.html
app.get('/{*any}', (req, res) => {
    if (clientDistPath) {
        return res.sendFile(path.join(clientDistPath, 'index.html'));
    }
    return res.status(503).send('Frontend build is missing. Backend is running.');
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    logInfo(`Server listening on port ${PORT}`);
    logInfo(`Log level: ${LOG_LEVEL}`);
    logInfo(`Live API version: ${LIVE_API_VERSION}`);
});
