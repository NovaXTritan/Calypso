/**
 * Gemini AI configuration and rate limits for the Journal AI system.
 *
 * Reuses the GEMINI_API_KEY secret already set for the WhatsApp system.
 */

export const GEMINI_CONFIG = {
  get apiKey(): string {
    return process.env.GEMINI_API_KEY || "";
  },
  chatModel: "gemini-2.0-flash-exp" as const,
  analysisModel: "gemini-2.0-flash-exp" as const,
  maxChatTokens: 1024,
  maxAnalysisTokens: 2048,
  chatTemperature: 0.7,
  analysisTemperature: 0.6,
};

export const RATE_LIMITS = {
  maxChatMessagesPerDay: 50,
  maxAnalysisPerWeek: 2,
  maxJournalEntriesForChat: 14,
  maxJournalEntriesForAnalysis: 30,
  maxMessagesPerSession: 100,
  maxChatHistoryMessages: 20,
};

/** Secrets required for journal-ai functions */
export const JOURNAL_AI_SECRETS = ["GEMINI_API_KEY"] as const;

/** All secrets (includes WhatsApp secrets for weekly analysis WhatsApp integration) */
export const ALL_SECRETS = [
  "GEMINI_API_KEY",
  "WA_PHONE_NUMBER_ID",
  "WA_ACCESS_TOKEN",
  "WA_VERIFY_TOKEN",
] as const;
