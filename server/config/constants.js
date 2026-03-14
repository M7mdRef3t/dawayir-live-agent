// ═══════════════════════════════════════════════════════
// Server Configuration Constants
// All tunable values in one place for easy discovery.
// ═══════════════════════════════════════════════════════

export const GEMINI_RECONNECT_MAX_ATTEMPTS = Number(process.env.GEMINI_RECONNECT_MAX_ATTEMPTS || 10);
export const GEMINI_RECONNECT_BASE_DELAY_MS = Number(process.env.GEMINI_RECONNECT_BASE_DELAY_MS || 1200);
export const GEMINI_RECONNECT_MAX_DELAY_MS = Number(process.env.GEMINI_RECONNECT_MAX_DELAY_MS || 15000);
export const GEMINI_RECOVERY_COOLDOWN_MS = Number(process.env.GEMINI_RECOVERY_COOLDOWN_MS || 30000);
export const MAX_PENDING_CLIENT_MESSAGES = 120;

// Hybrid conversation settings
export const HYBRID_MAX_USER_TURNS = Number(process.env.HYBRID_MAX_USER_TURNS || 6);
export const HYBRID_DAWAYIR_MAX_OUTPUT_TOKENS = Number(process.env.HYBRID_DAWAYIR_MAX_OUTPUT_TOKENS || 200);
export const HYBRID_DAWAYIR_RECOVERY_MAX_OUTPUT_TOKENS = Number(process.env.HYBRID_DAWAYIR_RECOVERY_MAX_OUTPUT_TOKENS || 180);
export const HYBRID_USER_AGENT_MAX_OUTPUT_TOKENS = Number(process.env.HYBRID_USER_AGENT_MAX_OUTPUT_TOKENS || 250);

// Voice configuration
export const LIVE_DAWAYIR_VOICE = process.env.GEMINI_LIVE_DAWAYIR_VOICE || process.env.GEMINI_LIVE_VOICE || 'Charon';
export const LIVE_USER_AGENT_VOICE = process.env.GEMINI_LIVE_USER_AGENT_VOICE || 'Aoede';

// Gemini model
export const LIVE_MODEL = process.env.GEMINI_LIVE_MODEL || 'gemini-2.5-flash-native-audio-latest';
export const LIVE_MODEL_FALLBACKS = Array.from(new Set([
    LIVE_MODEL,
    ...String(process.env.GEMINI_LIVE_MODEL_FALLBACKS || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
]));
export const LIVE_API_VERSION = process.env.GEMINI_API_VERSION || 'v1beta';

// Demo mode
export const DEMO_MODE = process.env.DEMO_MODE === 'true';

// Cloud
export const PROJECT_ID = process.env.GOOGLE_PROJECT_ID || 'alrehla-486806';
export const BUCKET_NAME = process.env.GOOGLE_CLOUD_STORAGE_BUCKET;

// Logging
export const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();

// WebSocket contract migration
export const WS_LEGACY_FIELDS = process.env.WS_LEGACY_FIELDS !== '0';
