/**
 * Environment configuration for WhatsApp + Gemini APIs
 *
 * Set secrets with:
 *   firebase functions:secrets:set WA_PHONE_NUMBER_ID
 *   firebase functions:secrets:set WA_ACCESS_TOKEN
 *   firebase functions:secrets:set WA_VERIFY_TOKEN
 *   firebase functions:secrets:set GEMINI_API_KEY
 */
export declare const WA_CONFIG: {
    readonly phoneNumberId: string;
    readonly accessToken: string;
    readonly verifyToken: string;
    apiVersion: "v21.0";
    graphUrl: "https://graph.facebook.com";
    readonly baseUrl: string;
};
export declare const GEMINI_CONFIG: {
    readonly apiKey: string;
    model: "gemini-2.0-flash-exp";
    temperature: number;
    maxOutputTokens: number;
};
/** Secrets that must be available to Cloud Functions */
export declare const REQUIRED_SECRETS: readonly ["WA_PHONE_NUMBER_ID", "WA_ACCESS_TOKEN", "WA_VERIFY_TOKEN", "GEMINI_API_KEY"];
/** Rate limiting & batching constants */
export declare const LIMITS: {
    readonly BATCH_SIZE: 50;
    readonly SEND_DELAY_MS: 100;
    readonly MAX_RETRIES: 3;
    readonly MAX_MESSAGE_LENGTH: 4096;
    readonly GEMINI_RPM: 15;
};
