"use strict";
/**
 * AI Message Generator
 *
 * Uses Gemini Flash API to generate deeply personalized WhatsApp notifications
 * based on aggregated user context.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMessage = generateMessage;
const generative_ai_1 = require("@google/generative-ai");
const config_1 = require("./config");
/**
 * Generate a personalized WhatsApp message using Gemini AI
 */
async function generateMessage(context, notificationType) {
    const prompt = buildPrompt(context, notificationType);
    const genAI = new generative_ai_1.GoogleGenerativeAI(config_1.GEMINI_CONFIG.apiKey);
    const model = genAI.getGenerativeModel({
        model: config_1.GEMINI_CONFIG.model,
        generationConfig: {
            temperature: config_1.GEMINI_CONFIG.temperature,
            maxOutputTokens: config_1.GEMINI_CONFIG.maxOutputTokens,
            responseMimeType: "application/json",
        },
    });
    try {
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        const promptTokens = response.usageMetadata?.promptTokenCount || 0;
        const aiResponse = JSON.parse(text);
        const formatted = formatForWhatsApp(aiResponse, context.user.displayName);
        // Ensure message doesn't exceed WhatsApp limits
        if (formatted.body.length > config_1.LIMITS.MAX_MESSAGE_LENGTH) {
            formatted.body = formatted.body.substring(0, config_1.LIMITS.MAX_MESSAGE_LENGTH - 3) + "...";
        }
        return { ...formatted, promptTokens };
    }
    catch (error) {
        console.error("Gemini generation failed:", error);
        // Fallback to a simple non-AI message
        return {
            ...buildFallbackMessage(context, notificationType),
            promptTokens: 0,
        };
    }
}
// ========================================
// Prompt Builder
// ========================================
function buildPrompt(context, notificationType) {
    const { user, streakData, pods, journalEntries, recentNotifications, todayProofs } = context;
    const podSummary = pods
        .map((pod) => {
        const memberLines = pod.memberActivity
            .map((m) => {
            const proofInfo = m.lastProofContent
                ? `last proof: "${m.lastProofContent}"`
                : "no recent proof";
            return `  - ${m.displayName} (streak: ${m.streak}, ${proofInfo})`;
        })
            .join("\n");
        return `Pod: ${pod.podName} (${pod.totalProofsLast24h} proofs in last 24h)\n${memberLines}`;
    })
        .join("\n\n");
    const journalSummary = journalEntries.length > 0
        ? journalEntries
            .map((j) => `[Mood: ${j.mood || "unset"}] ${j.content}`)
            .join("\n---\n")
        : "No journal entries in the last 7 days.";
    const recentNotifSummary = recentNotifications
        .map((n) => `[${n.type}] ${n.messagePreview}`)
        .join("\n");
    const typeInstructions = getTypeSpecificInstructions(notificationType);
    return `You are an AI assistant for Cosmos, a peer accountability platform for ambitious Indian students.

Generate a DEEPLY PERSONALIZED WhatsApp notification for this user. Every element must reference specific, real data from their context.

=== USER PROFILE ===
Name: ${user.displayName}
Goals: ${user.goals?.join(", ") || "Not set"}
Bio: ${user.bio || "Not set"}

=== STREAK DATA ===
Current Streak: ${streakData.currentStreak} days
Longest Streak: ${streakData.longestStreak} days
Submitted Proof Today: ${streakData.todayProofSubmitted ? "YES" : "NO"}
Last Proof: ${streakData.lastProofAt ? new Date(streakData.lastProofAt).toISOString() : "Never"}

=== POD ACTIVITY ===
${podSummary || "Not in any pods."}

=== JOURNAL ENTRIES (LAST 7 DAYS) ===
${journalSummary}

=== TODAY'S PROOFS ===
${todayProofs.length > 0 ? todayProofs.map((p) => `[${p.podSlug}] ${p.content}`).join("\n") : "None submitted today."}

=== RECENT NOTIFICATIONS SENT (avoid repetition) ===
${recentNotifSummary || "None"}

=== NOTIFICATION TYPE ===
${notificationType}: ${typeInstructions}

=== RULES ===
1. Be SPECIFIC - reference actual project names, actual tools, actual metrics from the context above
2. Reference REAL pod member activity (use their names and streaks)
3. NEVER use generic motivational language like "You got this!" or "Keep pushing!"
4. If journal sentiment suggests burnout or stress, suggest rest/recovery instead of pushing harder
5. Keep total message under 300 words
6. Use a "supportive researcher" tone - analytical, warm, specific
7. Do NOT repeat themes from recent notifications listed above

=== OUTPUT FORMAT ===
Respond with ONLY a JSON object (no markdown, no backticks):
{
  "header": "Short attention-grabbing header (max 50 chars)",
  "importance": "Why this matters RIGHT NOW for the user (1-2 sentences)",
  "problemStatement": "The specific challenge to address (1 sentence)",
  "input": "What the user needs to begin (1 sentence)",
  "process": "Step-by-step micro-actions (2-3 numbered steps)",
  "expectedOutcome": "Concrete result of completing this (1 sentence)",
  "podContext": "What their pod members are doing (1-2 sentences referencing real data)"
}`;
}
function getTypeSpecificInstructions(type) {
    switch (type) {
        case "morning_routine":
            return "Morning kickoff message. Help them plan the first 2 hours of their day with specific actions based on their goals and current projects.";
        case "streak_alert":
            return "Their streak is at risk! They haven't submitted proof today. Create urgency without anxiety. Reference how far they've come.";
        case "pod_update":
            return "Evening pod digest. Summarize what happened in their pods today. Highlight who was active, who might need encouragement.";
        case "learning_nudge":
            return "Nudge to start a scheduled learning block. Reference specific topics from their goals or recent proofs.";
        case "journal_insight":
            return "Weekly journal analysis. Synthesize patterns from their journal entries - mood trends, recurring themes, growth signals, or concerns.";
        case "project_reminder":
            return "Reminder about an active project or goal. Reference specific progress metrics and next milestones.";
        default:
            return "General personalized check-in based on their activity.";
    }
}
// ========================================
// WhatsApp Formatting
// ========================================
function formatForWhatsApp(ai, userName) {
    const body = [
        `*${ai.header}*`,
        "",
        `Hey ${userName},`,
        "",
        `*Why this matters:* ${ai.importance}`,
        "",
        `*The challenge:* ${ai.problemStatement}`,
        "",
        `*To start:* ${ai.input}`,
        "",
        `*Action steps:*`,
        ai.process,
        "",
        `*Expected result:* ${ai.expectedOutcome}`,
        "",
        `*Your pod:* ${ai.podContext}`,
        "",
        "_Reply anything to keep your free notification window open!_",
    ].join("\n");
    return {
        header: ai.header,
        body,
    };
}
// ========================================
// Fallback (when Gemini fails)
// ========================================
function buildFallbackMessage(context, notificationType) {
    const { user, streakData, pods } = context;
    const name = user.displayName || "there";
    let body;
    switch (notificationType) {
        case "streak_alert":
            body = [
                `*Streak Check*`,
                "",
                `Hey ${name},`,
                "",
                `Your ${streakData.currentStreak}-day streak is waiting for today's proof.`,
                pods.length > 0
                    ? `Your ${pods[0].podName} pod had ${pods[0].totalProofsLast24h} proofs in the last 24h.`
                    : "",
                "",
                "_Submit your proof to keep the streak alive._",
            ]
                .filter(Boolean)
                .join("\n");
            break;
        case "morning_routine":
            body = [
                `*Morning Check-in*`,
                "",
                `Good morning ${name}!`,
                "",
                `Current streak: ${streakData.currentStreak} days.`,
                user.goals?.length
                    ? `Today's focus: ${user.goals[0]}`
                    : "What's your focus today?",
                "",
                "_Reply with your plan for today._",
            ].join("\n");
            break;
        default:
            body = [
                `*Cosmos Update*`,
                "",
                `Hey ${name},`,
                "",
                `Streak: ${streakData.currentStreak} days`,
                `Proofs today: ${context.todayProofs.length}`,
                "",
                "_Check in with your pod today._",
            ].join("\n");
    }
    return { header: "Cosmos Update", body };
}
//# sourceMappingURL=messageGenerator.js.map