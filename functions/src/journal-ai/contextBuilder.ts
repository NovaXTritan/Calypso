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
 *
 * @param userId - The authenticated user's ID
 * @param maxJournalEntries - Max journal entries to include (14 for chat, 30 for analysis)
 * @param sessionId - Optional chat session ID to load message history
 */
export async function buildAnalysisContext(
  userId: string,
  maxJournalEntries: number = RATE_LIMITS.maxJournalEntriesForChat,
  sessionId?: string
): Promise<AnalysisContext> {
  // Run all queries in parallel
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
// Individual Query Functions
// ========================================

async function fetchJournalEntries(
  userId: string,
  limit: number
): Promise<JournalEntry[]> {
  const snapshot = await db
    .collection("journal_entries")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<JournalEntry, "id">),
  }));
}

async function fetchGoals(userId: string): Promise<Goal | null> {
  const snapshot = await db
    .collection("users")
    .doc(userId)
    .collection("goals")
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as Goal;
}

async function fetchPreviousInsight(
  userId: string
): Promise<AIAnalysisResponse | null> {
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
}

async function fetchPodActivity(
  userId: string
): Promise<PodMemberActivity[]> {
  // Get user's joined pods
  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) return [];

  const userData = userDoc.data();
  const joinedPods: string[] = userData?.joinedPods || [];
  if (joinedPods.length === 0) return [];

  // Get pod members (limit to first pod for context size)
  const podSlug = joinedPods[0];
  const membersSnapshot = await db
    .collection("users")
    .where("joinedPods", "array-contains", podSlug)
    .limit(8)
    .get();

  const activities: PodMemberActivity[] = [];

  for (const memberDoc of membersSnapshot.docs) {
    if (memberDoc.id === userId) continue; // Skip self

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
    } else {
      const summaries = proofsSnapshot.docs.map((p) => {
        const data = p.data();
        const content =
          data.content?.substring(0, 60) || "Submitted proof";
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

async function fetchChatHistory(
  userId: string,
  sessionId: string
): Promise<ChatMessage[]> {
  const snapshot = await db
    .collection("users")
    .doc(userId)
    .collection("chatSessions")
    .doc(sessionId)
    .collection("messages")
    .orderBy("createdAt", "asc")
    .limitToLast(RATE_LIMITS.maxChatHistoryMessages)
    .get();

  return snapshot.docs.map((doc) => doc.data() as ChatMessage);
}

/**
 * Check how many chat messages the user has sent today.
 * Used for rate limiting.
 */
export async function getChatMessageCountToday(
  userId: string
): Promise<number> {
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
export async function getWeeklyAnalysisCount(
  userId: string
): Promise<number> {
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
}
