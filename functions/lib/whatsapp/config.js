"use strict";
/**
 * Environment configuration for WhatsApp + Gemini APIs
 *
 * Set secrets with:
 *   firebase functions:secrets:set WA_PHONE_NUMBER_ID
 *   firebase functions:secrets:set WA_ACCESS_TOKEN
 *   firebase functions:secrets:set WA_VERIFY_TOKEN
 *   firebase functions:secrets:set GEMINI_API_KEY
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LIMITS = exports.REQUIRED_SECRETS = exports.GEMINI_CONFIG = exports.WA_CONFIG = void 0;
exports.WA_CONFIG = {
    get phoneNumberId() {
        return process.env.WA_PHONE_NUMBER_ID || "";
    },
    get accessToken() {
        return process.env.WA_ACCESS_TOKEN || "";
    },
    get verifyToken() {
        return process.env.WA_VERIFY_TOKEN || "";
    },
    apiVersion: "v21.0",
    graphUrl: "https://graph.facebook.com",
    get baseUrl() {
        return `${this.graphUrl}/${this.apiVersion}/${this.phoneNumberId}/messages`;
    },
};
exports.GEMINI_CONFIG = {
    get apiKey() {
        return process.env.GEMINI_API_KEY || "";
    },
    model: "gemini-2.0-flash-exp",
    temperature: 0.7,
    maxOutputTokens: 500,
};
/** Secrets that must be available to Cloud Functions */
exports.REQUIRED_SECRETS = [
    "WA_PHONE_NUMBER_ID",
    "WA_ACCESS_TOKEN",
    "WA_VERIFY_TOKEN",
    "GEMINI_API_KEY",
];
/** Rate limiting & batching constants */
exports.LIMITS = {
    BATCH_SIZE: 50,
    SEND_DELAY_MS: 100,
    MAX_RETRIES: 3,
    MAX_MESSAGE_LENGTH: 4096,
    GEMINI_RPM: 15,
};
//# sourceMappingURL=config.js.map