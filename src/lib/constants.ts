// Single-user prototype. Rename APP_NAME here when the product name is decided.
export const APP_NAME = 'Vantage';
export const USER_ID = 'local';

// AI provider: Google Gemini (@google/genai), key in GEMINI_API_KEY.
// Default workhorse — cheap, capable, strong structured-output support.
export const AI_MODEL = 'gemini-2.5-flash';
// Fallback for quality-sensitive tasks (verb fidelity) if flash proves insufficient.
export const AI_MODEL_HEAVY = 'gemini-2.5-pro';
