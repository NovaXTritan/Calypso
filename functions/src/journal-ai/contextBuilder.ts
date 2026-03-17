/**
 * Context Builder for Journal AI
 *
 * Queries Firestore in parallel to assemble the full context
 * needed for Gemini chat and analysis interactions.
 */

import * as admin from "firebase-admin";
import { RATE_LIMITS } from "./config";
import {
  AnalysisContext,
  JournalEntry,
  Goal,
  AIAnalysisResponse,
  ChatMessage,
  PodMemberActivity,
} from "./types";

const db = admin.firestore();

/**
 * Build the full analysis context for a user by querying Firestore in parallel.
 */
export async function buildAnalysisContext(
  userId: string,
  maxJournalEntries: number = RATE_LIMITS.maxJournalEntriesForChat,
  sessionId?: string
): Promise<AnalysisContext> {
  // Run all queries in parallel — each wrapped in try-catch
  const [journals, goals, previousInsight, podActivity, chatHistory] =
    await Promise.all([
      fetchJournalEntries(userId, maxJournalEntries),
      fetchGoals(userId),
      fetchPreviousInsight(userId),
      fetchPodActivity(userId),
      sessionId
        ? fetchChatHistory(userId, sessionId)
        : Promise.resolve([] as ChatMessage[]),
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
      insufficientDataMessage:
        "Write a few more journal entries so I can start spotting patterns. I need at least 3 entries to begin analysis.",
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
// Individual Query Functions (all safe)
// ========================================

async function fetchJournalEntries(
  userId: string,
  entryLimit: number
): Promise<JournalEntry[]> {
  try {
    // Simple query: filter by userId, then sort in memory to avoid
    // composite index requirement if index isn't built yet
    const snapshot = await db
      .collection("journal_entries")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(entryLimit)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<JournalEntry, "id">),
    }));
  } catch (error) {
    // Fallback: query without orderBy (no composite index needed)
    console.warn("journal_entries composite index not ready, using fallback query");
    try {
      const snapshot = await db
        .collection("journal_entries")
        .where("userId", "==", userId)
        .get();

      const entries = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<JournalEntry, "id">),
      }));

      // Sort in memory and limit
      entries.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      return entries.slice(0, entryLimit);
    } catch (fallbackError) {
      console.error("Failed to fetch journal entries:", fallbackError);
      return [];
    }
  }
}

async function fetchGoals(userId: string): Promise<Goal | null> {
  try {
    const snapshot = await db
      .collection("users")
      .doc(userId)
      .collection("goals")
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as Goal;
  } catch (error) {
    // Fallback without orderBy
    try {
      const snapshot = await db
        .collection("users")
        .doc(userId)
        .collection("goals")
        .limit(1)
        .get();

      if (snapshot.empty) return null;
      return snapshot.docs[0].data() as Goal;
    } catch {
      console.error("Failed to fetch goals:", error);
      return null;
    }
  }
}

async function fetchPreviousInsight(
  userId: string
): Promise<AIAnalysisResponse | null> {
  try {
    const snapshot = await db
      .collection("users")
      .doc(userId)
      .collection("insights")
      .orderBy("generatedAt", "desc")
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    const data = snapshot.docs[0].data();
    return data.analysis as AIAnalysisResponse;
  } catch (error) {
    console.error("Failed to fetch previous insight:", error);
    return null;
  }
}

async function fetchPodActivity(
  userId: string
): Promise<PodMemberActivity[]> {
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) return [];

    const userData = userDoc.data();
    const joinedPods: string[] = userData?.joinedPods || [];
    if (joinedPods.length === 0) return [];

    const podSlug = joinedPods[0];
    const membersSnapshot = await db
      .collection("users")
      .where("joinedPods", "array-contains", podSlug)
      .limit(8)
      .get();

    const activities: PodMemberActivity[] = [];

    for (const memberDoc of membersSnapshot.docs) {
      if (memberDoc.id === userId) continue;

      const memberData = memberDoc.data();
      const memberName = memberData.displayName || "Anonymous";

      try {
        const proofsSnapshot = await db
          .collection("proofs")
          .where("authorId", "==", memberDoc.id)
          .orderBy("createdAt", "desc")
          .limit(3)
          .get();

        if (proofsSnapshot.empty) {
          activities.push({ memberName, recentProofSummary: "No recent activity" });
        } else {
          const summaries = proofsSnapshot.docs.map((p) => {
            const data = p.data();
            return data.content?.substring(0, 60) || "Submitted proof";
          });
          activities.push({ memberName, recentProofSummary: summaries.join("; ") });
        }
      } catch {
        activities.push({ memberName, recentProofSummary: "Activity unavailable" });
      }
    }

    return activities;
  } catch (error) {
    console.error("Failed to fetch pod activity:", error);
    return [];
  }
}

async function fetchChatHistory(
  userId: string,
  sessionId: string
): Promise<ChatMessage[]> {
  try {
    const snapshot = await db
      .collection("users")
      .doc(userId)
      .collection("chatSessions")
      .doc(sessionId)
      .collection("messages")
      .orderBy("createdAt", "asc")
      .get();

    const docs = snapshot.docs;
    // Take last N messages
    const sliced = docs.slice(
      Math.max(0, docs.length - RATE_LIMITS.maxChatHistoryMessages)
    );
    return sliced.map((doc) => doc.data() as ChatMessage);
  } catch (error) {
    console.error("Failed to fetch chat history:", error);
    return [];
  }
}

/**
 * Check how many chat messages the user has sent today.
 * Simplified to avoid composite index on messages subcollection.
 */
export async function getChatMessageCountToday(
  userId: string
): Promise<number> {
  try {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const istMidnight = new Date(
      istNow.getFullYear(),
      istNow.getMonth(),
      istNow.getDate()
    );
    const todayStart = admin.firestore.Timestamp.fromMillis(
      istMidnight.getTime() - istOffset
    );

    // Get sessions updated today
    const sessionsSnapshot = await db
      .collection("users")
      .doc(userId)
      .collection("chatSessions")
      .where("updatedAt", ">=", todayStart)
      .get();

    let count = 0;
    for (const sessionDoc of sessionsSnapshot.docs) {
      // Get ALL messages today (no role filter = no composite index needed)
      const messagesSnapshot = await sessionDoc.ref
        .collection("messages")
        .where("createdAt", ">=", todayStart)
        .get();

      // Count only user messages in memory
      for (const msgDoc of messagesSnapshot.docs) {
        if (msgDoc.data().role === "user") {
          count++;
        }
      }
    }

    return count;
  } catch (error) {
    console.error("Failed to get chat message count:", error);
    // On error, don't block the user — return 0
    return 0;
  }
}

/**
 * Count weekly analyses for rate limiting on-demand analysis.
 */
export async function getWeeklyAnalysisCount(
  userId: string
): Promise<number> {
  try {
    const weekAgo = admin.firestore.Timestamp.fromMillis(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    );

    const snapshot = await db
      .collection("users")
      .doc(userId)
      .collection("insights")
      .where("generatedAt", ">=", weekAgo)
      .get();

    return snapshot.size;
  } catch (error) {
    console.error("Failed to get weekly analysis count:", error);
    return 0;
  }
}
