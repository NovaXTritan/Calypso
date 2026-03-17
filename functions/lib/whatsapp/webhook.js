"use strict";
/**
 * WhatsApp Webhook Handler
 *
 * Handles both Meta webhook verification (GET) and
 * incoming messages / delivery status updates (POST).
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsappWebhook = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const config_1 = require("./config");
const sender_1 = require("./sender");
const contextAggregator_1 = require("./contextAggregator");
const db = admin.firestore();
exports.whatsappWebhook = (0, https_1.onRequest)({
    secrets: [...config_1.REQUIRED_SECRETS],
    maxInstances: 10,
}, async (req, res) => {
    // ---- GET: Meta webhook verification ----
    if (req.method === "GET") {
        const mode = req.query["hub.mode"];
        const token = req.query["hub.verify_token"];
        const challenge = req.query["hub.challenge"];
        if (mode === "subscribe" && token === config_1.WA_CONFIG.verifyToken) {
            console.log("Webhook verified successfully");
            res.status(200).send(challenge);
            return;
        }
        res.status(403).send("Verification failed");
        return;
    }
    // ---- POST: Incoming messages & status updates ----
    if (req.method === "POST") {
        // Always respond 200 quickly to prevent Meta retries
        res.status(200).send("EVENT_RECEIVED");
        try {
            const payload = req.body;
            if (payload.object !== "whatsapp_business_account")
                return;
            for (const entry of payload.entry) {
                for (const change of entry.changes) {
                    const value = change.value;
                    // Handle incoming messages
                    if (value.messages && value.messages.length > 0) {
                        for (const message of value.messages) {
                            await handleIncomingMessage(message.from, message.text?.body || "", message.id);
                        }
                    }
                    // Handle delivery/read status updates
                    if (value.statuses && value.statuses.length > 0) {
                        for (const status of value.statuses) {
                            await handleStatusUpdate(status.id, status.status);
                        }
                    }
                }
            }
        }
        catch (error) {
            // Log but don't re-throw -- we already sent 200
            console.error("Webhook processing error:", error);
        }
        return;
    }
    res.status(405).send("Method not allowed");
});
// ========================================
// Incoming Message Handler
// ========================================
async function handleIncomingMessage(from, body, messageId) {
    const phone = `+${from}`;
    const normalizedBody = body.trim().toLowerCase();
    // Find user by phone number
    const userSnapshot = await db
        .collection("users")
        .where("phone", "==", phone)
        .limit(1)
        .get();
    const userId = userSnapshot.empty ? null : userSnapshot.docs[0].id;
    // Open/refresh service window (24h free messaging)
    if (userId) {
        await (0, sender_1.openServiceWindow)(phone, userId);
    }
    // Handle commands
    switch (normalizedBody) {
        case "stop":
        case "unsubscribe":
            if (userId) {
                await db.collection("users").doc(userId).update({
                    whatsappOptIn: false,
                });
                await sendSimpleReply(from, "You've been unsubscribed from Cosmos WhatsApp notifications. Reply START to re-subscribe anytime.");
            }
            break;
        case "start":
        case "subscribe":
            if (userId) {
                await db.collection("users").doc(userId).update({
                    whatsappOptIn: true,
                });
                await sendSimpleReply(from, "Welcome back! You're now subscribed to Cosmos notifications. Manage your preferences in the Cosmos app settings.");
            }
            break;
        case "status":
            if (userId) {
                const context = await (0, contextAggregator_1.aggregateUserContext)(userId);
                if (context) {
                    const streakInfo = [
                        `*Your Cosmos Status*`,
                        "",
                        `Streak: ${context.streakData.currentStreak} days`,
                        `Today's proofs: ${context.todayProofs.length}`,
                        `Pods: ${context.pods.map((p) => p.podName).join(", ") || "None"}`,
                        "",
                        context.streakData.todayProofSubmitted
                            ? "You've submitted proof today!"
                            : "No proof yet today - submit one to keep your streak!",
                    ].join("\n");
                    await sendSimpleReply(from, streakInfo);
                }
            }
            break;
        case "proof":
            await sendSimpleReply(from, "Submit your proof of work here:\nhttps://cosmos.app/#/\n\nLog in and click 'Submit Proof' in your pod.");
            break;
        default:
            // Any message opens the service window; send a brief acknowledgment
            if (userId) {
                await sendSimpleReply(from, "Got it! Your free notification window is open for 24h.\n\nCommands: STATUS, PROOF, STOP");
            }
            else {
                await sendSimpleReply(from, "This number isn't linked to a Cosmos account. Add your phone number in Cosmos Settings to get started.");
            }
            break;
    }
}
// ========================================
// Status Update Handler
// ========================================
async function handleStatusUpdate(waMessageId, status) {
    // Find the notification log by WhatsApp message ID
    const logsSnapshot = await db
        .collection("notificationLogs")
        .where("waMessageId", "==", waMessageId)
        .limit(1)
        .get();
    if (logsSnapshot.empty)
        return;
    await logsSnapshot.docs[0].ref.update({
        status,
        updatedAt: admin.firestore.Timestamp.now(),
    });
}
// ========================================
// Simple Reply Helper
// ========================================
async function sendSimpleReply(to, body) {
    const { default: axios } = await Promise.resolve().then(() => __importStar(require("axios")));
    try {
        await axios.post(config_1.WA_CONFIG.baseUrl, {
            messaging_product: "whatsapp",
            to,
            type: "text",
            text: { preview_url: false, body },
        }, {
            headers: {
                Authorization: `Bearer ${config_1.WA_CONFIG.accessToken}`,
                "Content-Type": "application/json",
            },
            timeout: 10000,
        });
    }
    catch (error) {
        console.error("Failed to send reply:", error);
    }
}
//# sourceMappingURL=webhook.js.map