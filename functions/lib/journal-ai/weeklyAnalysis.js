"use strict";
/**
 * Weekly Journal Analysis — Scheduled + On-Demand
 *
 * Generates structured AI insights from journal entries,
 * stores them in Firestore, and optionally sends a
 * WhatsApp summary using the existing notification system.
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
exports.analyzeJournalOnDemand = exports.journalWeeklyAnalysis = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const generative_ai_1 = require("@google/generative-ai");
const config_1 = require("./config");
const prompts_1 = require("./prompts");
const contextBuilder_1 = require("./contextBuilder");
const sender_1 = require("../whatsapp/sender");
const db = admin.firestore();
// ========================================
// Scheduled: Every Sunday 10:00 AM IST
// ========================================
exports.journalWeeklyAnalysis = (0, scheduler_1.onSchedule)({
    schedule: "0 10 * * 0",
    timeZone: "Asia/Kolkata",
    memory: "1GiB",
    timeoutSeconds: 540,
    secrets: [...config_1.ALL_SECRETS],
}, async () => {
    console.log("Starting weekly journal analysis batch");
    // Get eligible users: opted in + journalInsights preference + enough entries
    const usersSnapshot = await db
        .collection("users")
        .where("whatsappOptIn", "==", true)
        .get();
    const eligibleUsers = [];
    for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const prefs = userData.notificationPreferences;
        if (!prefs?.journalInsights)
            continue;
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
    console.log(`Found ${eligibleUsers.length} eligible users for weekly analysis`);
    // Process in batches of 20 with delays for Gemini rate limits
    for (let i = 0; i < eligibleUsers.length; i += 20) {
        const batch = eligibleUsers.slice(i, i + 20);
        for (const user of batch) {
            try {
                const insight = await generateInsightForUser(user.id);
                if (!insight)
                    continue;
                // Send WhatsApp notification if opted in and has phone
                if (user.phone) {
                    await sendInsightWhatsApp(user.id, user.phone, insight.analysis);
                }
                // Delay between Gemini calls (4 seconds for 15 RPM limit)
                await sleep(4000);
            }
            catch (error) {
                console.error(`Error processing weekly analysis for user ${user.id}:`, error);
            }
        }
    }
    console.log("Completed weekly journal analysis batch");
});
// ========================================
// On-Demand: User-triggered analysis
// ========================================
exports.analyzeJournalOnDemand = (0, https_1.onCall)({
    memory: "512MiB",
    timeoutSeconds: 120,
    secrets: [...config_1.JOURNAL_AI_SECRETS],
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must be logged in.");
    }
    const userId = request.auth.uid;
    // Rate limit: max 2 analyses per week
    const weeklyCount = await (0, contextBuilder_1.getWeeklyAnalysisCount)(userId);
    if (weeklyCount >= config_1.RATE_LIMITS.maxAnalysisPerWeek) {
        throw new https_1.HttpsError("resource-exhausted", "You've already used your analysis quota this week. Next analysis available after 7 days.");
    }
    const insight = await generateInsightForUser(userId);
    if (!insight) {
        throw new https_1.HttpsError("failed-precondition", "Not enough data for analysis. Write at least 3 journal entries first.");
    }
    return insight;
});
// ========================================
// Core Analysis Logic
// ========================================
async function generateInsightForUser(userId) {
    // Build context
    const context = await (0, contextBuilder_1.buildAnalysisContext)(userId, config_1.RATE_LIMITS.maxJournalEntriesForAnalysis);
    if (context.insufficientData) {
        console.log(`Skipping user ${userId}: insufficient journal data`);
        return null;
    }
    // Build the context message
    const contextMessage = (0, prompts_1.buildChatContext)(context.journals, context.goals, context.previousInsight, context.podActivity);
    // Call Gemini for structured analysis
    let analysisResponse;
    try {
        const genAI = new generative_ai_1.GoogleGenerativeAI(config_1.GEMINI_CONFIG.apiKey);
        const model = genAI.getGenerativeModel({
            model: config_1.GEMINI_CONFIG.analysisModel,
            generationConfig: {
                maxOutputTokens: config_1.GEMINI_CONFIG.maxAnalysisTokens,
                temperature: config_1.GEMINI_CONFIG.analysisTemperature,
            },
        });
        const prompt = `${prompts_1.SYSTEM_PROMPT_ANALYSIS}\n\n---\n\nStudent Data:\n\n${contextMessage}`;
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const tokensUsed = result.response.usageMetadata?.totalTokenCount || 0;
        // Parse JSON — handle potential markdown wrapping
        analysisResponse = parseAnalysisJSON(responseText);
        // Store insight in Firestore
        const now = admin.firestore.Timestamp.now();
        const weekAgo = admin.firestore.Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const insightData = {
            generatedAt: now,
            periodStart: weekAgo,
            periodEnd: now,
            journalEntriesAnalyzed: context.journals.length,
            analysis: analysisResponse,
            tokensUsed,
            model: config_1.GEMINI_CONFIG.analysisModel,
        };
        await db
            .collection("users")
            .doc(userId)
            .collection("insights")
            .add(insightData);
        console.log(`Generated insight for user ${userId}: score=${analysisResponse.alignmentScore}, tokens=${tokensUsed}`);
        return insightData;
    }
    catch (error) {
        const err = error;
        console.error(`Gemini analysis error for user ${userId}:`, err.message);
        // Retry once on rate limit
        if (err.status === 429) {
            await sleep(5000);
            try {
                const genAI = new generative_ai_1.GoogleGenerativeAI(config_1.GEMINI_CONFIG.apiKey);
                const model = genAI.getGenerativeModel({
                    model: config_1.GEMINI_CONFIG.analysisModel,
                    generationConfig: {
                        maxOutputTokens: config_1.GEMINI_CONFIG.maxAnalysisTokens,
                        temperature: config_1.GEMINI_CONFIG.analysisTemperature,
                    },
                });
                const prompt = `${prompts_1.SYSTEM_PROMPT_ANALYSIS}\n\n---\n\nStudent Data:\n\n${contextMessage}`;
                const result = await model.generateContent(prompt);
                const responseText = result.response.text();
                const tokensUsed = result.response.usageMetadata?.totalTokenCount || 0;
                analysisResponse = parseAnalysisJSON(responseText);
                const now = admin.firestore.Timestamp.now();
                const weekAgo = admin.firestore.Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000);
                const insightData = {
                    generatedAt: now,
                    periodStart: weekAgo,
                    periodEnd: now,
                    journalEntriesAnalyzed: context.journals.length,
                    analysis: analysisResponse,
                    tokensUsed,
                    model: config_1.GEMINI_CONFIG.analysisModel,
                };
                await db
                    .collection("users")
                    .doc(userId)
                    .collection("insights")
                    .add(insightData);
                return insightData;
            }
            catch (retryError) {
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
function parseAnalysisJSON(text) {
    // Strip markdown code blocks if present
    let cleaned = text.trim();
    if (cleaned.startsWith("```json")) {
        cleaned = cleaned.slice(7);
    }
    else if (cleaned.startsWith("```")) {
        cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith("```")) {
        cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();
    try {
        const parsed = JSON.parse(cleaned);
        // Validate required fields
        if (typeof parsed.alignmentScore !== "number") {
            parsed.alignmentScore = 50;
        }
        if (!Array.isArray(parsed.keyInsights)) {
            parsed.keyInsights = [];
        }
        if (!parsed.balanceCheck) {
            parsed.balanceCheck = {
                status: "warning",
                message: "Unable to fully assess balance.",
                neglectedAreas: [],
            };
        }
        if (!parsed.weeklyExperiment) {
            parsed.weeklyExperiment = {
                title: "Reflect on your week",
                description: "Take 15 minutes to review what worked and what didn't.",
                measurable: "Write a brief summary by Sunday evening.",
            };
        }
        if (!parsed.compassionateNote) {
            parsed.compassionateNote =
                "Keep showing up — the consistency itself is a signal of commitment.";
        }
        if (!parsed.actualAllocation) {
            parsed.actualAllocation = {};
        }
        return parsed;
    }
    catch (parseError) {
        console.error("Failed to parse Gemini JSON response:", parseError);
        // Return a safe fallback
        return {
            alignmentScore: 50,
            actualAllocation: {},
            keyInsights: [
                {
                    type: "pattern",
                    severity: "low",
                    title: "Analysis incomplete this week",
                    insight: "The AI was unable to fully parse this week's analysis. This is a temporary issue.",
                    suggestion: "Try the on-demand analysis again, or wait for next week's automated analysis.",
                },
            ],
            balanceCheck: {
                status: "warning",
                message: "Unable to assess life balance this week due to a processing issue.",
                neglectedAreas: [],
            },
            weeklyExperiment: {
                title: "Detailed journaling",
                description: "This week, try including specific time estimates in your journal entries (e.g., 'Spent 2 hours on DSA').",
                measurable: "At least 3 entries this week mention specific time spent on activities.",
            },
            compassionateNote: "Your consistency in journaling is building a foundation for better insights next week.",
        };
    }
}
// ========================================
// WhatsApp Integration
// ========================================
async function sendInsightWhatsApp(userId, phone, analysis) {
    try {
        // Build a concise WhatsApp message
        const topInsight = analysis.keyInsights.length > 0
            ? analysis.keyInsights.sort((a, b) => {
                const severityOrder = {
                    high: 3,
                    medium: 2,
                    low: 1,
                };
                return ((severityOrder[b.severity] || 0) -
                    (severityOrder[a.severity] || 0));
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
        await (0, sender_1.sendWhatsAppMessage)(phone, userId, message, "cosmos_journal_insight", "journal_insight", 0);
    }
    catch (error) {
        console.error(`Failed to send WhatsApp insight to user ${userId}:`, error);
    }
}
// ========================================
// Utilities
// ========================================
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=weeklyAnalysis.js.map