"use strict";
/**
 * Context Builder for Journal AI
 *
 * Queries Firestore in parallel to assemble the full context
 * needed for Gemini chat and analysis interactions.
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
exports.buildAnalysisContext = buildAnalysisContext;
exports.getChatMessageCountToday = getChatMessageCountToday;
exports.getWeeklyAnalysisCount = getWeeklyAnalysisCount;
const admin = __importStar(require("firebase-admin"));
const config_1 = require("./config");
const db = admin.firestore();
/**
 * Build the full analysis context for a user by querying Firestore in parallel.
 *
 * @param userId - The authenticated user's ID
 * @param maxJournalEntries - Max journal entries to include (14 for chat, 30 for analysis)
 * @param sessionId - Optional chat session ID to load message history
 */
async function buildAnalysisContext(userId, maxJournalEntries = config_1.RATE_LIMITS.maxJournalEntriesForChat, sessionId) {
    // Run all queries in parallel
    const [journals, goals, previousInsight, podActivity, chatHistory] = await Promise.all([
        fetchJournalEntries(userId, maxJournalEntries),
        fetchGoals(userId),
        fetchPreviousInsight(userId),
        fetchPodActivity(userId),
        sessionId
            ? fetchChatHistory(userId, sessionId)
            : Promise.resolve([]),
    ]);
    // Check for insufficient data
    if (journals.length < 3) {
        return {
            journals,
            goals,
            goalsConfigured: goals !== null,
            previousInsight,
            podActivity,
            chatHistory,
            insufficientData: true,
            insufficientDataMessage: "Write a few more journal entries so I can start spotting patterns. I need at least 3 entries to begin analysis.",
        };
    }
    return {
        journals,
        goals,
        goalsConfigured: goals !== null,
        previousInsight,
        podActivity,
        chatHistory,
        insufficientData: false,
    };
}
// ========================================
// Individual Query Functions
// ========================================
async function fetchJournalEntries(userId, limit) {
    const snapshot = await db
        .collection("journal_entries")
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));
}
async function fetchGoals(userId) {
    const snapshot = await db
        .collection("users")
        .doc(userId)
        .collection("goals")
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();
    if (snapshot.empty)
        return null;
    return snapshot.docs[0].data();
}
async function fetchPreviousInsight(userId) {
    const snapshot = await db
        .collection("users")
        .doc(userId)
        .collection("insights")
        .orderBy("generatedAt", "desc")
        .limit(1)
        .get();
    if (snapshot.empty)
        return null;
    const data = snapshot.docs[0].data();
    return data.analysis;
}
async function fetchPodActivity(userId) {
    // Get user's joined pods
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists)
        return [];
    const userData = userDoc.data();
    const joinedPods = userData?.joinedPods || [];
    if (joinedPods.length === 0)
        return [];
    // Get pod members (limit to first pod for context size)
    const podSlug = joinedPods[0];
    const membersSnapshot = await db
        .collection("users")
        .where("joinedPods", "array-contains", podSlug)
        .limit(8)
        .get();
    const activities = [];
    for (const memberDoc of membersSnapshot.docs) {
        if (memberDoc.id === userId)
            continue; // Skip self
        const memberData = memberDoc.data();
        const memberName = memberData.displayName || "Anonymous";
        // Get their last 3 proofs
        const proofsSnapshot = await db
            .collection("proofs")
            .where("authorId", "==", memberDoc.id)
            .orderBy("createdAt", "desc")
            .limit(3)
            .get();
        if (proofsSnapshot.empty) {
            activities.push({
                memberName,
                recentProofSummary: "No recent activity",
            });
        }
        else {
            const summaries = proofsSnapshot.docs.map((p) => {
                const data = p.data();
                const content = data.content?.substring(0, 60) || "Submitted proof";
                return content;
            });
            activities.push({
                memberName,
                recentProofSummary: summaries.join("; "),
            });
        }
    }
    return activities;
}
async function fetchChatHistory(userId, sessionId) {
    const snapshot = await db
        .collection("users")
        .doc(userId)
        .collection("chatSessions")
        .doc(sessionId)
        .collection("messages")
        .orderBy("createdAt", "asc")
        .limitToLast(config_1.RATE_LIMITS.maxChatHistoryMessages)
        .get();
    return snapshot.docs.map((doc) => doc.data());
}
/**
 * Check how many chat messages the user has sent today.
 * Used for rate limiting.
 */
async function getChatMessageCountToday(userId) {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const istMidnight = new Date(istNow.getFullYear(), istNow.getMonth(), istNow.getDate());
    const todayStart = admin.firestore.Timestamp.fromMillis(istMidnight.getTime() - istOffset);
    // Count messages across all sessions today
    const sessionsSnapshot = await db
        .collection("users")
        .doc(userId)
        .collection("chatSessions")
        .where("updatedAt", ">=", todayStart)
        .get();
    let count = 0;
    for (const sessionDoc of sessionsSnapshot.docs) {
        const messagesSnapshot = await sessionDoc.ref
            .collection("messages")
            .where("role", "==", "user")
            .where("createdAt", ">=", todayStart)
            .get();
        count += messagesSnapshot.size;
    }
    return count;
}
/**
 * Count weekly analyses for rate limiting on-demand analysis.
 */
async function getWeeklyAnalysisCount(userId) {
    const weekAgo = admin.firestore.Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const snapshot = await db
        .collection("users")
        .doc(userId)
        .collection("insights")
        .where("generatedAt", ">=", weekAgo)
        .get();
    return snapshot.size;
}
//# sourceMappingURL=contextBuilder.js.map