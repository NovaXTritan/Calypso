"use strict";
/**
 * Context Aggregator
 *
 * Pulls all relevant user context from Firestore in parallel
 * to build a rich UserContext object for AI message generation.
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
exports.aggregateUserContext = aggregateUserContext;
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
/**
 * Aggregate all context for a user from Firestore.
 * Uses Promise.all for parallel queries.
 */
async function aggregateUserContext(userId) {
    try {
        // First, fetch the user profile (we need it for pod memberships)
        const userDoc = await db.collection("users").doc(userId).get();
        if (!userDoc.exists) {
            console.error(`User ${userId} not found`);
            return null;
        }
        const user = { ...userDoc.data(), uid: userId };
        const joinedPods = user.joinedPods || [];
        // Run all remaining queries in parallel
        const [streakData, pods, journalEntries, recentNotifications, todayProofs] = await Promise.all([
            fetchStreakData(userId),
            fetchPodContexts(joinedPods, userId),
            fetchJournalEntries(userId),
            fetchRecentNotifications(userId),
            fetchTodayProofs(userId),
        ]);
        return {
            user,
            streakData,
            pods,
            journalEntries,
            recentNotifications,
            todayProofs,
        };
    }
    catch (error) {
        console.error(`Failed to aggregate context for user ${userId}:`, error);
        return null;
    }
}
// ========================================
// Individual Data Fetchers
// ========================================
async function fetchStreakData(userId) {
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();
    // Check if user submitted proof today
    const todayStart = getStartOfDayIST();
    const todayProofsSnapshot = await db
        .collection("proofs")
        .where("authorId", "==", userId)
        .where("createdAt", ">=", todayStart)
        .limit(1)
        .get();
    // Find last proof timestamp
    const lastProofSnapshot = await db
        .collection("proofs")
        .where("authorId", "==", userId)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();
    const lastProofAt = lastProofSnapshot.empty
        ? null
        : lastProofSnapshot.docs[0].data().createdAt;
    return {
        currentStreak: userData?.streak || 0,
        longestStreak: userData?.longestStreak || userData?.streak || 0,
        lastProofAt,
        todayProofSubmitted: !todayProofsSnapshot.empty,
    };
}
async function fetchPodContexts(podSlugs, currentUserId) {
    if (podSlugs.length === 0)
        return [];
    // Only process first 5 pods to keep context manageable
    const slugsToFetch = podSlugs.slice(0, 5);
    const podContexts = await Promise.all(slugsToFetch.map(async (slug) => {
        const memberActivity = await fetchPodMemberActivity(slug, currentUserId);
        const last24hProofs = await countLast24hProofs(slug);
        return {
            podSlug: slug,
            podName: formatPodName(slug),
            memberActivity,
            totalProofsLast24h: last24hProofs,
        };
    }));
    return podContexts;
}
async function fetchPodMemberActivity(podSlug, excludeUserId) {
    // Find users in this pod
    const membersSnapshot = await db
        .collection("users")
        .where("joinedPods", "array-contains", podSlug)
        .limit(10)
        .get();
    const activities = [];
    for (const memberDoc of membersSnapshot.docs) {
        if (memberDoc.id === excludeUserId)
            continue;
        const memberData = memberDoc.data();
        // Get their last proof
        const lastProofSnapshot = await db
            .collection("proofs")
            .where("authorId", "==", memberDoc.id)
            .where("podSlug", "==", podSlug)
            .orderBy("createdAt", "desc")
            .limit(1)
            .get();
        const lastProof = lastProofSnapshot.empty
            ? null
            : lastProofSnapshot.docs[0].data();
        activities.push({
            displayName: memberData.displayName || "Anonymous",
            lastProofContent: lastProof?.content?.substring(0, 100) || null,
            lastProofAt: lastProof?.createdAt || null,
            streak: memberData.streak || 0,
        });
    }
    return activities;
}
async function countLast24hProofs(podSlug) {
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    const snapshot = await db
        .collection("proofs")
        .where("podSlug", "==", podSlug)
        .where("createdAt", ">=", twentyFourHoursAgo)
        .get();
    return snapshot.size;
}
async function fetchJournalEntries(userId) {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const snapshot = await db
        .collection("journal_entries")
        .where("userId", "==", userId)
        .where("createdAt", ">=", sevenDaysAgo)
        .orderBy("createdAt", "desc")
        .limit(7)
        .get();
    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            content: data.content?.substring(0, 300) || "",
            mood: data.mood || null,
            createdAt: data.createdAt,
        };
    });
}
async function fetchRecentNotifications(userId) {
    const snapshot = await db
        .collection("notificationLogs")
        .where("userId", "==", userId)
        .orderBy("sentAt", "desc")
        .limit(5)
        .get();
    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            type: data.type,
            messagePreview: data.messagePreview || "",
            sentAt: data.sentAt,
        };
    });
}
async function fetchTodayProofs(userId) {
    const todayStart = getStartOfDayIST();
    const snapshot = await db
        .collection("proofs")
        .where("authorId", "==", userId)
        .where("createdAt", ">=", todayStart)
        .orderBy("createdAt", "desc")
        .get();
    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            content: data.content || "",
            podSlug: data.podSlug || "",
            authorId: data.authorId,
            type: data.type || "text",
            createdAt: data.createdAt,
        };
    });
}
// ========================================
// Helpers
// ========================================
function getStartOfDayIST() {
    const now = new Date();
    // IST is UTC+5:30
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const istMidnight = new Date(istNow.getFullYear(), istNow.getMonth(), istNow.getDate());
    // Convert back to UTC timestamp
    return istMidnight.getTime() - istOffset;
}
function formatPodName(slug) {
    return slug
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}
//# sourceMappingURL=contextAggregator.js.map