/**
 * Weekly Journal Analysis — Scheduled + On-Demand
 *
 * Generates structured AI insights from journal entries,
 * stores them in Firestore, and optionally sends a
 * WhatsApp summary using the existing notification system.
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  GEMINI_CONFIG,
  RATE_LIMITS,
  ALL_SECRETS,
  JOURNAL_AI_SECRETS,
} from "./config";
import { SYSTEM_PROMPT_ANALYSIS, buildChatContext } from "./prompts";
import {
  buildAnalysisContext,
  getWeeklyAnalysisCount,
} from "./contextBuilder";
import { AIAnalysisResponse, Insight } from "./types";
import { sendWhatsAppMessage } from "../whatsapp/sender";

const db = admin.firestore();

// ========================================
// Scheduled: Every Sunday 10:00 AM IST
// ========================================

export const journalWeeklyAnalysis = onSchedule(
  {
    schedule: "0 10 * * 0",
    timeZone: "Asia/Kolkata",
    memory: "1GiB",
    timeoutSeconds: 540,
    secrets: [...ALL_SECRETS],
  },
  async () => {
    console.log("Starting weekly journal analysis batch");

    // Get eligible users: opted in + journalInsights preference + enough entries
    const usersSnapshot = await db
      .collection("users")
      .where("whatsappOptIn", "==", true)
      .get();

    const eligibleUsers: Array<{ id: string; phone?: string }> = [];

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const prefs = userData.notificationPreferences;

      if (!prefs?.journalInsights) continue;

      // Check they have enough recent journal entries
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const entriesSnapshot = await db
        .collection("journal_entries")
        .where("userId", "==", userDoc.id)
        .where("createdAt", ">=", weekAgo)
        .limit(3)
        .get();

      if (entriesSnapshot.size >= 3) {
        eligibleUsers.push({
          id: userDoc.id,
          phone: userData.phone,
        });
      }
    }

    console.log(
      `Found ${eligibleUsers.length} eligible users for weekly analysis`
    );

    // Process in batches of 20 with delays for Gemini rate limits
    for (let i = 0; i < eligibleUsers.length; i += 20) {
      const batch = eligibleUsers.slice(i, i + 20);

      for (const user of batch) {
        try {
          const insight = await generateInsightForUser(user.id);
          if (!insight) continue;

          // Send WhatsApp notification if opted in and has phone
          if (user.phone) {
            await sendInsightWhatsApp(user.id, user.phone, insight.analysis);
          }

          // Delay between Gemini calls (4 seconds for 15 RPM limit)
          await sleep(4000);
        } catch (error) {
          console.error(
            `Error processing weekly analysis for user ${user.id}:`,
            error
          );
        }
      }
    }

    console.log("Completed weekly journal analysis batch");
  }
);

// ========================================
// On-Demand: User-triggered analysis
// ========================================

export const analyzeJournalOnDemand = onCall(
  {
    memory: "512MiB",
    timeoutSeconds: 120,
    secrets: [...JOURNAL_AI_SECRETS],
    invoker: "public",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be logged in.");
    }

    const userId = request.auth.uid;

    // Rate limit: max 2 analyses per week
    const weeklyCount = await getWeeklyAnalysisCount(userId);
    if (weeklyCount >= RATE_LIMITS.maxAnalysisPerWeek) {
      throw new HttpsError(
        "resource-exhausted",
        "You've already used your analysis quota this week. Next analysis available after 7 days."
      );
    }

    const insight = await generateInsightForUser(userId);
    if (!insight) {
      throw new HttpsError(
        "failed-precondition",
        "Not enough data for analysis. Write at least 3 journal entries first."
      );
    }

    return insight;
  }
);

// ========================================
// Core Analysis Logic
// ========================================

async function generateInsightForUser(
  userId: string
): Promise<Insight | null> {
  // Build context
  const context = await buildAnalysisContext(
    userId,
    RATE_LIMITS.maxJournalEntriesForAnalysis
  );

  if (context.insufficientData) {
    console.log(`Skipping user ${userId}: insufficient journal data`);
    return null;
  }

  // Build the context message
  const contextMessage = buildChatContext(
    context.journals,
    context.goals,
    context.previousInsight,
    context.podActivity
  );

  // Call Gemini for structured analysis
  let analysisResponse: AIAnalysisResponse;

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_CONFIG.apiKey);
    const model = genAI.getGenerativeModel({
      model: GEMINI_CONFIG.analysisModel,
      generationConfig: {
        maxOutputTokens: GEMINI_CONFIG.maxAnalysisTokens,
        temperature: GEMINI_CONFIG.analysisTemperature,
      },
    });

    const prompt = `${SYSTEM_PROMPT_ANALYSIS}\n\n---\n\nStudent Data:\n\n${contextMessage}`;
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const tokensUsed =
      result.response.usageMetadata?.totalTokenCount || 0;

    console.log(`ANALYSIS_DEBUG: Response length=${responseText.length}, tokens=${tokensUsed}`);
    console.log(`ANALYSIS_DEBUG: First 500 chars: ${responseText.substring(0, 500)}`);

    // Parse JSON — handle potential markdown wrapping
    analysisResponse = parseAnalysisJSON(responseText);

    console.log(`ANALYSIS_DEBUG: Parsed alignmentScore=${analysisResponse.alignmentScore}, insightsCount=${analysisResponse.keyInsights?.length}, allocKeys=${Object.keys(analysisResponse.actualAllocation || {}).join(",")}`);

    // Store insight in Firestore
    const now = admin.firestore.Timestamp.now();
    const weekAgo = admin.firestore.Timestamp.fromMillis(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    );

    const insightData: Insight = {
      generatedAt: now,
      periodStart: weekAgo,
      periodEnd: now,
      journalEntriesAnalyzed: context.journals.length,
      analysis: analysisResponse,
      tokensUsed,
      model: GEMINI_CONFIG.analysisModel,
    };

    await db
      .collection("users")
      .doc(userId)
      .collection("insights")
      .add(insightData);

    console.log(
      `Generated insight for user ${userId}: score=${analysisResponse.alignmentScore}, tokens=${tokensUsed}`
    );

    return insightData;
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    console.error(
      `Gemini analysis error for user ${userId}:`,
      err.message
    );

    // Retry once on rate limit
    if (err.status === 429) {
      await sleep(5000);
      try {
        const genAI = new GoogleGenerativeAI(GEMINI_CONFIG.apiKey);
        const model = genAI.getGenerativeModel({
          model: GEMINI_CONFIG.analysisModel,
          generationConfig: {
            maxOutputTokens: GEMINI_CONFIG.maxAnalysisTokens,
            temperature: GEMINI_CONFIG.analysisTemperature,
          },
        });

        const prompt = `${SYSTEM_PROMPT_ANALYSIS}\n\n---\n\nStudent Data:\n\n${contextMessage}`;
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const tokensUsed =
          result.response.usageMetadata?.totalTokenCount || 0;

        analysisResponse = parseAnalysisJSON(responseText);

        const now = admin.firestore.Timestamp.now();
        const weekAgo = admin.firestore.Timestamp.fromMillis(
          Date.now() - 7 * 24 * 60 * 60 * 1000
        );

        const insightData: Insight = {
          generatedAt: now,
          periodStart: weekAgo,
          periodEnd: now,
          journalEntriesAnalyzed: context.journals.length,
          analysis: analysisResponse,
          tokensUsed,
          model: GEMINI_CONFIG.analysisModel,
        };

        await db
          .collection("users")
          .doc(userId)
          .collection("insights")
          .add(insightData);

        return insightData;
      } catch (retryError) {
        console.error(`Gemini retry failed for user ${userId}:`, retryError);
        return null;
      }
    }

    return null;
  }
}

// ========================================
// JSON Parsing
// ========================================

function parseAnalysisJSON(text: string): AIAnalysisResponse {
  let cleaned = text.trim();

  // Strategy 1: Strip markdown code blocks
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

  // Strategy 2: Extract JSON object from surrounding text
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }

  try {
    const parsed = JSON.parse(cleaned) as AIAnalysisResponse;
    return validateAnalysis(parsed);
  } catch (firstError) {
    console.error("ANALYSIS_DEBUG: First parse attempt failed:", (firstError as Error).message);
    console.error("ANALYSIS_DEBUG: Cleaned text (first 300):", cleaned.substring(0, 300));

    // Strategy 3: Try to fix common JSON issues (trailing commas, incomplete)
    try {
      // Remove trailing commas before } or ]
      let fixed = cleaned.replace(/,\s*([}\]])/g, "$1");
      // Try to close unclosed structures
      const opens = (fixed.match(/\{/g) || []).length;
      const closes = (fixed.match(/\}/g) || []).length;
      for (let i = 0; i < opens - closes; i++) {
        fixed += "}";
      }
      const bracketOpens = (fixed.match(/\[/g) || []).length;
      const bracketCloses = (fixed.match(/\]/g) || []).length;
      for (let i = 0; i < bracketOpens - bracketCloses; i++) {
        fixed += "]";
      }
      // Re-extract JSON
      const reMatch = fixed.match(/\{[\s\S]*\}/);
      if (reMatch) {
        const parsed = JSON.parse(reMatch[0]) as AIAnalysisResponse;
        console.log("ANALYSIS_DEBUG: Fixed JSON parse succeeded");
        return validateAnalysis(parsed);
      }
    } catch (secondError) {
      console.error("ANALYSIS_DEBUG: Second parse attempt failed:", (secondError as Error).message);
    }

    // Final fallback
    console.error("ANALYSIS_DEBUG: All parse attempts failed, using fallback");
    return {
      alignmentScore: 50,
      actualAllocation: {},
      keyInsights: [
        {
          type: "pattern",
          severity: "low",
          title: "Analysis incomplete this week",
          insight: "The AI response could not be parsed. This is a temporary issue.",
          suggestion: "Try the on-demand analysis again.",
        },
      ],
      balanceCheck: { status: "warning", message: "Unable to assess balance this week.", neglectedAreas: [] },
      weeklyExperiment: { title: "Detailed journaling", description: "Include time estimates in entries.", measurable: "3 entries with specific hours." },
      compassionateNote: "Your consistency in journaling matters — better insights are coming.",
    };
  }
}

function validateAnalysis(parsed: AIAnalysisResponse): AIAnalysisResponse {
  if (typeof parsed.alignmentScore !== "number") parsed.alignmentScore = 50;
  if (!Array.isArray(parsed.keyInsights)) parsed.keyInsights = [];
  if (!parsed.balanceCheck) {
    parsed.balanceCheck = { status: "warning", message: "Unable to fully assess balance.", neglectedAreas: [] };
  }
  if (!parsed.weeklyExperiment) {
    parsed.weeklyExperiment = { title: "Reflect on your week", description: "Review what worked.", measurable: "Write a brief summary." };
  }
  if (!parsed.compassionateNote) {
    parsed.compassionateNote = "Keep showing up — consistency is a signal of commitment.";
  }
  if (!parsed.actualAllocation) parsed.actualAllocation = {};
  return parsed;
}

// ========================================
// WhatsApp Integration
// ========================================

async function sendInsightWhatsApp(
  userId: string,
  phone: string,
  analysis: AIAnalysisResponse
): Promise<void> {
  try {
    // Build a concise WhatsApp message
    const topInsight =
      analysis.keyInsights.length > 0
        ? analysis.keyInsights.sort((a, b) => {
            const severityOrder: Record<string, number> = {
              high: 3,
              medium: 2,
              low: 1,
            };
            return (
              (severityOrder[b.severity] || 0) -
              (severityOrder[a.severity] || 0)
            );
          })[0]
        : null;

    let message = `*Weekly Journal Insight*\n\n`;
    message += `Alignment Score: ${analysis.alignmentScore}/100\n\n`;

    if (topInsight) {
      message += `*${topInsight.title}*\n${topInsight.insight}\n\n`;
      message += `Try: ${topInsight.suggestion}\n\n`;
    }

    if (analysis.weeklyExperiment) {
      message += `*This Week's Experiment:* ${analysis.weeklyExperiment.title}\n${analysis.weeklyExperiment.description}\n\n`;
    }

    message += `_${analysis.compassionateNote}_\n\n`;
    message += `Open Cosmos for the full report.`;

    await sendWhatsAppMessage(
      phone,
      userId,
      message,
      "cosmos_journal_insight",
      "journal_insight",
      0
    );
  } catch (error) {
    console.error(
      `Failed to send WhatsApp insight to user ${userId}:`,
      error
    );
  }
}

// ========================================
// Utilities
// ========================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
