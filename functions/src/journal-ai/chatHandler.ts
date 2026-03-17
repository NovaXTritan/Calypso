/**
 * Interactive Journal AI Chatbot — Cloud Function
 *
 * HTTPS Callable function that handles conversational AI
 * interactions using Gemini with full journal context.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_CONFIG, RATE_LIMITS, JOURNAL_AI_SECRETS } from "./config";
import { SYSTEM_PROMPT_CHAT, buildChatContext } from "./prompts";
import {
  buildAnalysisContext,
  getChatMessageCountToday,
} from "./contextBuilder";
import {
  ChatRequest,
  ChatResponse,
  ConversationMessage,
  ChatMessage,
} from "./types";

const db = admin.firestore();

/**
 * journalChat — Interactive AI chatbot callable function
 *
 * Accepts { sessionId: string | null, message: string }
 * Returns { sessionId: string, response: string, tokensUsed: number }
 */
export const journalChat = onCall(
  {
    memory: "512MiB",
    timeoutSeconds: 60,
    secrets: [...JOURNAL_AI_SECRETS],
    invoker: "public",
  },
  async (request): Promise<ChatResponse> => {
    // 1. Authenticate
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be logged in.");
    }
    const userId = request.auth.uid;

    // 2. Validate input
    const data = request.data as ChatRequest;
    if (!data.message || typeof data.message !== "string") {
      throw new HttpsError("invalid-argument", "Message is required.");
    }

    const message = data.message.trim();
    if (message.length === 0 || message.length > 2000) {
      throw new HttpsError(
        "invalid-argument",
        "Message must be between 1 and 2000 characters."
      );
    }

    // 3. Rate limit check
    const todayCount = await getChatMessageCountToday(userId);
    if (todayCount >= RATE_LIMITS.maxChatMessagesPerDay) {
      throw new HttpsError(
        "resource-exhausted",
        "You've reached today's chat limit (50 messages). Come back tomorrow!"
      );
    }

    // 4. Get or create session
    let sessionId = data.sessionId;
    const userSessionsRef = db
      .collection("users")
      .doc(userId)
      .collection("chatSessions");

    if (!sessionId) {
      // Create a new session
      const sessionDoc = await userSessionsRef.add({
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        title: message.substring(0, 60) + (message.length > 60 ? "..." : ""),
        messageCount: 0,
        contextWindow: {
          journalEntriesIncluded: 0,
          goalsIncluded: false,
          insightsIncluded: false,
          podContextIncluded: false,
        },
        status: "active",
      });
      sessionId = sessionDoc.id;
    } else {
      // Verify session exists and belongs to user
      const sessionDoc = await userSessionsRef.doc(sessionId).get();
      if (!sessionDoc.exists) {
        throw new HttpsError("not-found", "Chat session not found.");
      }

      // Check session message limit
      const sessionData = sessionDoc.data();
      if (
        sessionData &&
        sessionData.messageCount >= RATE_LIMITS.maxMessagesPerSession
      ) {
        throw new HttpsError(
          "resource-exhausted",
          "This chat session has reached its limit (100 messages). Please start a new chat for better response quality."
        );
      }
    }

    // 5. Build context from Firestore
    const context = await buildAnalysisContext(
      userId,
      RATE_LIMITS.maxJournalEntriesForChat,
      sessionId
    );

    // Handle insufficient data (regardless of goals status)
    if (context.insufficientData) {
      const fallbackResponse =
        context.insufficientDataMessage ||
        "I need more journal entries to start analyzing patterns. Keep writing and I'll be ready soon!";

      // Still save the messages for continuity
      const messagesRef = userSessionsRef
        .doc(sessionId)
        .collection("messages");

      const batch = db.batch();
      batch.set(messagesRef.doc(), {
        role: "user",
        content: message,
        createdAt: admin.firestore.Timestamp.now(),
      });
      batch.set(messagesRef.doc(), {
        role: "assistant",
        content: fallbackResponse,
        createdAt: admin.firestore.Timestamp.now(),
        tokensUsed: 0,
      });
      batch.update(userSessionsRef.doc(sessionId), {
        messageCount: admin.firestore.FieldValue.increment(2),
        updatedAt: admin.firestore.Timestamp.now(),
      });
      await batch.commit();

      return {
        sessionId,
        response: fallbackResponse,
        tokensUsed: 0,
      };
    }

    // 6. Build Gemini conversation
    const contextMessage = buildChatContext(
      context.journals,
      context.goals,
      context.previousInsight,
      context.podActivity
    );

    // Construct conversation history for Gemini
    const history: ConversationMessage[] = [
      // System prompt
      { role: "user", parts: [{ text: SYSTEM_PROMPT_CHAT }] },
      {
        role: "model",
        parts: [
          {
            text: "I understand my role as Cosmos Journal Analyst. I will be direct, evidence-based, and compassionate. I'll reference specific journal entries, compare actual effort to stated goals, and watch for burnout signals. No empty motivation — only honest, useful observations. Ready to help.",
          },
        ],
      },
      // Context with all user data
      {
        role: "user",
        parts: [
          {
            text: `Here is the student's data for context. Do not respond to this directly — wait for their actual message.\n\n${contextMessage}`,
          },
        ],
      },
      {
        role: "model",
        parts: [
          {
            text: "I've reviewed the journal entries, goals, and context. I'm ready for the student's question.",
          },
        ],
      },
    ];

    // Add previous conversation messages
    for (const msg of context.chatHistory) {
      history.push({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      });
    }

    // 7. Call Gemini
    let aiResponse: string;
    let tokensUsed = 0;

    try {
      const genAI = new GoogleGenerativeAI(GEMINI_CONFIG.apiKey);
      const model = genAI.getGenerativeModel({
        model: GEMINI_CONFIG.chatModel,
        generationConfig: {
          maxOutputTokens: GEMINI_CONFIG.maxChatTokens,
          temperature: GEMINI_CONFIG.chatTemperature,
        },
      });

      const chat = model.startChat({ history });
      const result = await chat.sendMessage(message);
      const response = result.response;

      aiResponse = response.text();
      tokensUsed = response.usageMetadata?.totalTokenCount || 0;
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      console.error("Gemini API error:", err.message);

      // Retry on rate limit
      if (err.status === 429) {
        await sleep(2000);
        try {
          const genAI = new GoogleGenerativeAI(GEMINI_CONFIG.apiKey);
          const model = genAI.getGenerativeModel({
            model: GEMINI_CONFIG.chatModel,
            generationConfig: {
              maxOutputTokens: GEMINI_CONFIG.maxChatTokens,
              temperature: GEMINI_CONFIG.chatTemperature,
            },
          });
          const chat = model.startChat({ history });
          const result = await chat.sendMessage(message);
          aiResponse = result.response.text();
          tokensUsed =
            result.response.usageMetadata?.totalTokenCount || 0;
        } catch (retryError) {
          console.error("Gemini retry failed:", retryError);
          aiResponse =
            "I'm having trouble analyzing right now. Try again in a moment.";
        }
      } else {
        aiResponse =
          "I'm having trouble analyzing right now. Try again in a moment.";
      }
    }

    // 8. Save messages to Firestore
    const messagesRef = userSessionsRef
      .doc(sessionId)
      .collection("messages");

    const batch = db.batch();

    batch.set(messagesRef.doc(), {
      role: "user",
      content: message,
      createdAt: admin.firestore.Timestamp.now(),
    });

    batch.set(messagesRef.doc(), {
      role: "assistant",
      content: aiResponse,
      createdAt: admin.firestore.Timestamp.now(),
      tokensUsed,
    });

    // 9. Update session metadata
    batch.update(userSessionsRef.doc(sessionId), {
      messageCount: admin.firestore.FieldValue.increment(2),
      updatedAt: admin.firestore.Timestamp.now(),
      contextWindow: {
        journalEntriesIncluded: context.journals.length,
        goalsIncluded: context.goalsConfigured,
        insightsIncluded: context.previousInsight !== null,
        podContextIncluded: context.podActivity.length > 0,
      },
    });

    await batch.commit();

    // 10. Log metadata only (no PII)
    console.log(
      `Chat: userId=${userId}, session=${sessionId}, tokens=${tokensUsed}`
    );

    return {
      sessionId,
      response: aiResponse,
      tokensUsed,
    };
  }
);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
