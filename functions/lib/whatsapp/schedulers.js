"use strict";
/**
 * Scheduled Cloud Functions for WhatsApp Notifications
 *
 * Each scheduler queries eligible users, generates personalized
 * messages via Gemini, and sends them through WhatsApp.
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
exports.journalInsight = exports.podDigest = exports.streakAlert = exports.morningRoutine = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
const config_1 = require("./config");
const contextAggregator_1 = require("./contextAggregator");
const messageGenerator_1 = require("./messageGenerator");
const sender_1 = require("./sender");
const db = admin.firestore();
// ========================================
// Template Mapping
// ========================================
const TEMPLATE_MAP = {
    morning_routine: "cosmos_daily_reminder",
    streak_alert: "cosmos_streak_alert",
    pod_update: "cosmos_pod_update",
    learning_nudge: "cosmos_daily_reminder",
    journal_insight: "cosmos_journal_insight",
    project_reminder: "cosmos_daily_reminder",
};
// ========================================
// Morning Routine Reminder - 6:00 AM IST daily
// ========================================
exports.morningRoutine = (0, scheduler_1.onSchedule)({
    schedule: "0 6 * * *",
    timeZone: "Asia/Kolkata",
    memory: "512MiB",
    secrets: [...config_1.REQUIRED_SECRETS],
}, async () => {
    await processNotificationType("morning_routine", "morningRoutine");
});
// ========================================
// Streak Alert - 9:00 PM IST daily
// ========================================
exports.streakAlert = (0, scheduler_1.onSchedule)({
    schedule: "0 21 * * *",
    timeZone: "Asia/Kolkata",
    memory: "512MiB",
    secrets: [...config_1.REQUIRED_SECRETS],
}, async () => {
    await processStreakAlerts();
});
// ========================================
// Pod Daily Digest - 8:00 PM IST daily
// ========================================
exports.podDigest = (0, scheduler_1.onSchedule)({
    schedule: "0 20 * * *",
    timeZone: "Asia/Kolkata",
    memory: "512MiB",
    secrets: [...config_1.REQUIRED_SECRETS],
}, async () => {
    await processNotificationType("pod_update", "podUpdates");
});
// ========================================
// Weekly Journal Insight - Sunday 10:00 AM IST
// ========================================
exports.journalInsight = (0, scheduler_1.onSchedule)({
    schedule: "0 10 * * 0",
    timeZone: "Asia/Kolkata",
    memory: "512MiB",
    secrets: [...config_1.REQUIRED_SECRETS],
}, async () => {
    await processNotificationType("journal_insight", "journalInsights");
});
// ========================================
// Core Processing Logic
// ========================================
/**
 * Generic processor for a notification type.
 * Queries eligible users, generates messages, sends them.
 */
async function processNotificationType(notificationType, preferenceKey) {
    console.log(`Starting ${notificationType} notifications`);
    const users = await getEligibleUsers(preferenceKey);
    console.log(`Found ${users.length} eligible users for ${notificationType}`);
    // Process in batches
    for (let i = 0; i < users.length; i += config_1.LIMITS.BATCH_SIZE) {
        const batch = users.slice(i, i + config_1.LIMITS.BATCH_SIZE);
        await processBatch(batch, notificationType);
    }
    console.log(`Completed ${notificationType} notifications`);
}
/**
 * Special processor for streak alerts - only targets users
 * who have active streaks but haven't submitted proof today.
 */
async function processStreakAlerts() {
    console.log("Starting streak alert notifications");
    const users = await getEligibleUsers("streakAlerts");
    // Filter to users with active streaks who haven't submitted today
    const eligibleUsers = [];
    const todayStart = getStartOfDayIST();
    for (const user of users) {
        if (!user.data.streak || user.data.streak === 0)
            continue;
        // Check if they submitted proof today
        const proofSnapshot = await db
            .collection("proofs")
            .where("authorId", "==", user.id)
            .where("createdAt", ">=", todayStart)
            .limit(1)
            .get();
        if (proofSnapshot.empty) {
            eligibleUsers.push(user);
        }
    }
    console.log(`${eligibleUsers.length} users need streak alerts`);
    for (let i = 0; i < eligibleUsers.length; i += config_1.LIMITS.BATCH_SIZE) {
        const batch = eligibleUsers.slice(i, i + config_1.LIMITS.BATCH_SIZE);
        await processBatch(batch, "streak_alert");
    }
    console.log("Completed streak alert notifications");
}
/**
 * Process a batch of users: aggregate context, generate message, send.
 */
async function processBatch(users, notificationType) {
    for (const user of users) {
        try {
            // Idempotency check: don't send same type twice in a day
            if (await alreadySentToday(user.id, notificationType)) {
                console.log(`Skipping ${user.id} - already sent ${notificationType} today`);
                continue;
            }
            // Quiet hours check
            if (isInQuietHours(user.data)) {
                console.log(`Skipping ${user.id} - in quiet hours`);
                continue;
            }
            // Aggregate context
            const context = await (0, contextAggregator_1.aggregateUserContext)(user.id);
            if (!context) {
                console.error(`Failed to aggregate context for ${user.id}`);
                continue;
            }
            // Generate AI message
            const message = await (0, messageGenerator_1.generateMessage)(context, notificationType);
            // Send via WhatsApp
            const templateName = TEMPLATE_MAP[notificationType];
            const result = await (0, sender_1.sendWhatsAppMessage)(user.data.phone, user.id, message.body, templateName, notificationType, message.promptTokens);
            if (result.success) {
                // Update last message timestamp
                await db.collection("users").doc(user.id).update({
                    lastWhatsAppMessageAt: admin.firestore.Timestamp.now(),
                });
            }
            // Rate limit between sends
            await (0, sender_1.delaySend)();
        }
        catch (error) {
            console.error(`Error processing user ${user.id}:`, error);
            // Continue with next user
        }
    }
}
// ========================================
// Query Helpers
// ========================================
/**
 * Get users who opted in to WhatsApp and have the specific notification enabled.
 */
async function getEligibleUsers(preferenceKey) {
    const snapshot = await db
        .collection("users")
        .where("whatsappOptIn", "==", true)
        .get();
    return snapshot.docs
        .map((doc) => ({
        id: doc.id,
        data: doc.data(),
    }))
        .filter((user) => {
        // Must have a phone number
        if (!user.data.phone)
            return false;
        // Check specific notification preference
        const prefs = user.data.notificationPreferences;
        if (!prefs)
            return false;
        return prefs[preferenceKey] === true;
    });
}
/**
 * Check if a notification of this type was already sent to this user today.
 */
async function alreadySentToday(userId, notificationType) {
    const todayStart = getStartOfDayIST();
    const todayTimestamp = admin.firestore.Timestamp.fromMillis(todayStart);
    const snapshot = await db
        .collection("notificationLogs")
        .where("userId", "==", userId)
        .where("type", "==", notificationType)
        .where("sentAt", ">=", todayTimestamp)
        .where("status", "in", ["sent", "delivered", "read"])
        .limit(1)
        .get();
    return !snapshot.empty;
}
/**
 * Check if the current time falls within the user's quiet hours.
 */
function isInQuietHours(user) {
    const prefs = user.notificationPreferences;
    if (!prefs?.quietHoursStart || !prefs?.quietHoursEnd)
        return false;
    const tz = prefs.timezone || "Asia/Kolkata";
    const now = new Date();
    // Get current time in user's timezone
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const currentHour = parseInt(parts.find((p) => p.type === "hour")?.value || "0");
    const currentMinute = parseInt(parts.find((p) => p.type === "minute")?.value || "0");
    const currentMinutes = currentHour * 60 + currentMinute;
    const [startH, startM] = prefs.quietHoursStart.split(":").map(Number);
    const [endH, endM] = prefs.quietHoursEnd.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    // Handle overnight quiet hours (e.g., 22:00 - 06:00)
    if (startMinutes > endMinutes) {
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}
// ========================================
// Utilities
// ========================================
function getStartOfDayIST() {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const istMidnight = new Date(istNow.getFullYear(), istNow.getMonth(), istNow.getDate());
    return istMidnight.getTime() - istOffset;
}
//# sourceMappingURL=schedulers.js.map