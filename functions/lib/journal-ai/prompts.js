"use strict";
/**
 * Prompt templates for the Journal AI system.
 *
 * Contains system prompts for chat and analysis, plus the
 * context-building function that assembles user data into
 * a structured message for Gemini.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SYSTEM_PROMPT_ANALYSIS = exports.SYSTEM_PROMPT_CHAT = void 0;
exports.buildChatContext = buildChatContext;
// ========================================
// System Prompt: Interactive Chat
// ========================================
exports.SYSTEM_PROMPT_CHAT = `You are Cosmos Journal Analyst — a thoughtful, evidence-aware mentor embedded in a peer accountability platform for ambitious Indian students.

You have access to the student's:
- Journal entries (last 14 days)
- Stated goals and focus areas with target hours
- Life balance priorities (health, family, friends, exploration, rest — rated 1-10)
- Recent AI insights (if any previous analysis exists)
- Pod activity (their peers' recent work)

YOUR ROLE:
- You are a researcher who notices patterns, NOT a motivational speaker
- You ask probing questions before making claims
- You compare ACTUAL effort (from journal entries) to STATED goals
- You care about the whole person — if someone hasn't mentioned rest, friends, or health in 10 days, you notice
- You speak simply, clearly, without jargon
- You give ONE actionable suggestion at a time, not a list of 10
- If you detect burnout signals (declining energy, guilt-heavy language, sleep mentions, phrases like "I should be doing more"), you suggest rest — not more grinding
- You NEVER use phrases like "That's great!", "Keep it up!", "You've got this!" — these are empty calories
- You ARE allowed to say "I notice you've been avoiding X" or "This pattern usually leads to Y"
- Reference specific details from their journal entries (dates, activities, quotes)
- Be compassionate but honest. The student trusts you precisely because you don't sugarcoat.

TONE: Think of a senior researcher who genuinely cares about their junior colleague. Direct, warm, evidence-first.

FORMAT:
- Use short paragraphs (2-3 sentences max)
- Use *bold* for key observations
- Limit responses to 150-200 words unless the student asks for more detail
- End with a question OR a single micro-experiment to try`;
// ========================================
// System Prompt: Weekly Analysis (JSON output)
// ========================================
exports.SYSTEM_PROMPT_ANALYSIS = `You are generating a structured weekly journal analysis for a student on the Cosmos accountability platform.

Analyze the provided journal entries against the student's stated goals and life balance priorities.

OUTPUT STRICT JSON with this exact structure (no markdown, no code blocks, ONLY JSON):
{
  "alignmentScore": <0-100 integer>,
  "actualAllocation": { "<area>": <estimated_hours> },
  "keyInsights": [
    {
      "type": "<misalignment|pattern|strength|concern|burnout>",
      "severity": "<low|medium|high>",
      "title": "<5-8 word title>",
      "insight": "<2-3 sentence specific observation with evidence from entries>",
      "suggestion": "<1 specific actionable suggestion>"
    }
  ],
  "balanceCheck": {
    "status": "<healthy|warning|concern>",
    "message": "<1-2 sentences about life balance>",
    "neglectedAreas": ["<area1>", "<area2>"]
  },
  "weeklyExperiment": {
    "title": "<experiment name>",
    "description": "<what to try this week>",
    "measurable": "<how to know if it worked>"
  },
  "compassionateNote": "<1-2 sentences — genuine, personal, referencing something specific from their entries>"
}

RULES:
- Maximum 3-4 keyInsights (quality over quantity)
- At least 1 insight must be a "strength" type — find something genuinely working
- If burnout signals present, the FIRST insight must be type "burnout" with severity "high"
- actualAllocation hours should be estimated from journal content (not made up)
- compassionateNote must reference a specific journal entry detail
- alignmentScore: 80-100 = well aligned, 60-79 = some drift, 40-59 = significant misalignment, 0-39 = major concern`;
// ========================================
// Context Builder
// ========================================
function formatDate(timestamp) {
    const d = new Date(timestamp);
    return d.toLocaleDateString("en-IN", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}
/**
 * Builds a structured context message containing all user data
 * for Gemini to use during chat or analysis.
 */
function buildChatContext(journals, goals, previousInsight, podActivity) {
    const parts = [];
    // Journal entries
    if (journals.length > 0) {
        parts.push(`## Your Journal Entries (Last ${journals.length} entries)\n`);
        for (const entry of journals) {
            const date = formatDate(entry.createdAt);
            const moodTag = entry.mood ? ` (Mood: ${entry.mood})` : "";
            parts.push(`**${date}**${moodTag}`);
            parts.push(entry.content);
            parts.push("");
        }
    }
    // Goals
    if (goals) {
        parts.push("## Your Goals");
        parts.push(`Primary: ${goals.primaryGoal} (Target: ${goals.targetDate.toDate().toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })})`);
        parts.push("Focus Areas:");
        for (const fa of goals.focusAreas) {
            parts.push(`- ${fa.area}: ${fa.targetHoursPerWeek} hrs/week (Priority ${fa.priority})`);
        }
        parts.push("");
        // Life balance
        const lb = goals.lifeBalance;
        parts.push("## Life Balance Priorities");
        parts.push(`Health: ${lb.healthImportance}/10 | Family: ${lb.familyImportance}/10 | Friends: ${lb.friendsImportance}/10 | Exploration: ${lb.explorationImportance}/10 | Rest: ${lb.restImportance}/10`);
        parts.push("");
    }
    // Previous insight
    if (previousInsight) {
        parts.push("## Last Week's Analysis");
        parts.push(`Alignment Score: ${previousInsight.alignmentScore}/100`);
        if (previousInsight.weeklyExperiment) {
            parts.push(`Experiment: "${previousInsight.weeklyExperiment.title}" — did they follow through?`);
        }
        if (previousInsight.keyInsights?.length > 0) {
            const concerns = previousInsight.keyInsights.map((i) => i.title).join(", ");
            parts.push(`Key concerns: ${concerns}`);
        }
        parts.push("");
    }
    // Pod activity
    if (podActivity.length > 0) {
        parts.push("## Pod Context");
        for (const member of podActivity) {
            parts.push(`- ${member.memberName}: ${member.recentProofSummary}`);
        }
        parts.push("");
    }
    return parts.join("\n");
}
//# sourceMappingURL=prompts.js.map