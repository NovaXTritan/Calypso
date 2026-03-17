/**
 * Gemini AI configuration and rate limits for the Journal AI system.
 *
 * Reuses the GEMINI_API_KEY secret already set for the WhatsApp system.
 */
export declare const GEMINI_CONFIG: {
    readonly apiKey: string;
    chatModel: "gemini-2.0-flash-exp";
    analysisModel: "gemini-2.0-flash-exp";
    maxChatTokens: number;
    maxAnalysisTokens: number;
    chatTemperature: number;
    analysisTemperature: number;
};
export declare const RATE_LIMITS: {
    maxChatMessagesPerDay: number;
    maxAnalysisPerWeek: number;
    maxJournalEntriesForChat: number;
    maxJournalEntriesForAnalysis: number;
    maxMessagesPerSession: number;
    maxChatHistoryMessages: number;
};
/** Secrets required for journal-ai functions */
export declare const JOURNAL_AI_SECRETS: readonly ["GEMINI_API_KEY"];
/** All secrets (includes WhatsApp secrets for weekly analysis WhatsApp integration) */
export declare const ALL_SECRETS: readonly ["GEMINI_API_KEY", "WA_PHONE_NUMBER_ID", "WA_ACCESS_TOKEN", "WA_VERIFY_TOKEN"];
