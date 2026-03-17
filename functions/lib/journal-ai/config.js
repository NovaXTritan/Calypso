"use strict";
/**
 * Gemini AI configuration and rate limits for the Journal AI system.
 *
 * Reuses the GEMINI_API_KEY secret already set for the WhatsApp system.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_SECRETS = exports.JOURNAL_AI_SECRETS = exports.RATE_LIMITS = exports.GEMINI_CONFIG = void 0;
exports.GEMINI_CONFIG = {
    get apiKey() {
        return process.env.GEMINI_API_KEY || "";
    },
    chatModel: "gemini-2.5-flash",
    analysisModel: "gemini-2.5-flash",
    maxChatTokens: 2048,
    maxAnalysisTokens: 4096,
    chatTemperature: 0.7,
    analysisTemperature: 0.6,
};
exports.RATE_LIMITS = {
    maxChatMessagesPerDay: 50,
    maxAnalysisPerWeek: 2,
    maxJournalEntriesForChat: 14,
    maxJournalEntriesForAnalysis: 30,
    maxMessagesPerSession: 100,
    maxChatHistoryMessages: 20,
};
/** Secrets required for journal-ai functions */
exports.JOURNAL_AI_SECRETS = ["GEMINI_API_KEY"];
/** All secrets (includes WhatsApp secrets for weekly analysis WhatsApp integration) */
exports.ALL_SECRETS = [
    "GEMINI_API_KEY",
    "WA_PHONE_NUMBER_ID",
    "WA_ACCESS_TOKEN",
    "WA_VERIFY_TOKEN",
];
//# sourceMappingURL=config.js.map