"use strict";
/**
 * WhatsApp Cloud API message sender
 *
 * Handles both free-form (service window) and template messages.
 * Includes retry logic with exponential backoff.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasActiveServiceWindow = hasActiveServiceWindow;
exports.openServiceWindow = openServiceWindow;
exports.sendWhatsAppMessage = sendWhatsAppMessage;
exports.delaySend = delaySend;
const admin = __importStar(require("firebase-admin"));
const axios_1 = __importDefault(require("axios"));
const config_1 = require("./config");
const db = admin.firestore();
// ========================================
// Service Window Management
// ========================================
/**
 * Check if a phone number has an active 24h service window
 * (opened when user sends us a message)
 */
async function hasActiveServiceWindow(phone) {
    const windowDoc = await db.collection("serviceWindows").doc(phone).get();
    if (!windowDoc.exists)
        return false;
    const data = windowDoc.data();
    if (!data?.expiresAt)
        return false;
    const expiresAt = data.expiresAt.toDate();
    return expiresAt > new Date();
}
/**
 * Open or refresh a service window for a phone number
 */
async function openServiceWindow(phone, userId) {
    const now = admin.firestore.Timestamp.now();
    const expiresAt = admin.firestore.Timestamp.fromMillis(now.toMillis() + 24 * 60 * 60 * 1000);
    await db.collection("serviceWindows").doc(phone).set({
        openedAt: now,
        expiresAt,
        userId,
    });
}
// ========================================
// Message Sending
// ========================================
/**
 * Send a WhatsApp message (auto-selects template vs free-form)
 */
async function sendWhatsAppMessage(phone, userId, body, templateName, notificationType, aiPromptTokens = 0) {
    // Truncate to WhatsApp max length
    const truncatedBody = body.length > config_1.LIMITS.MAX_MESSAGE_LENGTH
        ? body.substring(0, config_1.LIMITS.MAX_MESSAGE_LENGTH - 3) + "..."
        : body;
    const inServiceWindow = await hasActiveServiceWindow(phone);
    const costCategory = inServiceWindow ? "free_window" : "utility";
    // Build the payload
    const payload = inServiceWindow
        ? buildFreeFormPayload(phone, truncatedBody)
        : buildTemplatePayload(phone, truncatedBody, templateName);
    // Attempt to send with retries
    const result = await sendWithRetry(payload);
    // Log the notification
    const logData = {
        userId,
        type: notificationType,
        waMessageId: result.messageId || "",
        status: (result.success ? "sent" : "failed"),
        templateUsed: inServiceWindow ? "free_form" : templateName,
        costCategory,
        aiPromptTokens,
        messagePreview: truncatedBody.substring(0, 100),
        sentAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
    };
    try {
        await db.collection("notificationLogs").add(logData);
    }
    catch (logError) {
        console.error("Failed to write notification log:", logError);
    }
    // If failed, also log to failedNotifications for manual retry
    if (!result.success) {
        try {
            await db.collection("failedNotifications").add({
                ...logData,
                error: result.error,
                phone,
                fullBody: truncatedBody,
            });
        }
        catch (failLogError) {
            console.error("Failed to write failed notification log:", failLogError);
        }
    }
    return result;
}
// ========================================
// Payload Builders
// ========================================
function buildFreeFormPayload(phone, body) {
    // Strip leading + and any non-digit characters for the API
    const cleanPhone = phone.replace(/\D/g, "");
    return {
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "text",
        text: {
            preview_url: false,
            body,
        },
    };
}
function buildTemplatePayload(phone, body, templateName) {
    const cleanPhone = phone.replace(/\D/g, "");
    return {
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "template",
        template: {
            name: templateName,
            language: { code: "en" },
            components: [
                {
                    type: "body",
                    parameters: [{ type: "text", text: body }],
                },
            ],
        },
    };
}
// ========================================
// Retry Logic
// ========================================
async function sendWithRetry(payload, attempt = 1) {
    try {
        const response = await axios_1.default.post(config_1.WA_CONFIG.baseUrl, payload, {
            headers: {
                Authorization: `Bearer ${config_1.WA_CONFIG.accessToken}`,
                "Content-Type": "application/json",
            },
            timeout: 10000,
        });
        const messageId = response.data?.messages?.[0]?.id;
        return { success: true, messageId };
    }
    catch (error) {
        const axiosError = error;
        const status = axiosError.response?.status;
        const errorMsg = axiosError.response?.data
            ? JSON.stringify(axiosError.response.data)
            : axiosError.message;
        console.error(`WhatsApp send attempt ${attempt}/${config_1.LIMITS.MAX_RETRIES} failed:`, errorMsg);
        // Retry on 5xx or rate limit (429), not on 4xx client errors
        if (attempt < config_1.LIMITS.MAX_RETRIES &&
            (status === undefined || status === 429 || status >= 500)) {
            const backoffMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
            await sleep(backoffMs);
            return sendWithRetry(payload, attempt + 1);
        }
        return { success: false, error: errorMsg };
    }
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Delay helper for rate limiting between batch sends
 */
function delaySend() {
    return sleep(config_1.LIMITS.SEND_DELAY_MS);
}
//# sourceMappingURL=sender.js.map