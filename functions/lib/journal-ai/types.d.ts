/**
 * TypeScript interfaces for the Journal AI system
 */
import { Timestamp } from "firebase-admin/firestore";
export interface FocusArea {
    area: string;
    targetHoursPerWeek: number;
    priority: number;
}
export interface LifeBalance {
    healthImportance: number;
    familyImportance: number;
    friendsImportance: number;
    explorationImportance: number;
    restImportance: number;
}
export interface Goal {
    primaryGoal: string;
    targetDate: Timestamp;
    focusAreas: FocusArea[];
    lifeBalance: LifeBalance;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}
export interface JournalEntry {
    id?: string;
    userId: string;
    date: string;
    content: string;
    mood?: string;
    tags?: string[];
    createdAt: number;
    updatedAt?: number;
}
export interface InsightItem {
    type: "misalignment" | "pattern" | "strength" | "concern" | "burnout";
    severity: "low" | "medium" | "high";
    title: string;
    insight: string;
    suggestion: string;
}
export interface BalanceCheck {
    status: "healthy" | "warning" | "concern";
    message: string;
    neglectedAreas: string[];
}
export interface WeeklyExperiment {
    title: string;
    description: string;
    measurable: string;
}
export interface AIAnalysisResponse {
    alignmentScore: number;
    actualAllocation: Record<string, number>;
    keyInsights: InsightItem[];
    balanceCheck: BalanceCheck;
    weeklyExperiment: WeeklyExperiment;
    compassionateNote: string;
}
export interface Insight {
    generatedAt: Timestamp;
    periodStart: Timestamp;
    periodEnd: Timestamp;
    journalEntriesAnalyzed: number;
    analysis: AIAnalysisResponse;
    tokensUsed: number;
    model: string;
}
export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    createdAt: Timestamp;
    tokensUsed?: number;
    contextSnapshot?: Record<string, unknown>;
}
export interface ChatSessionContext {
    journalEntriesIncluded: number;
    goalsIncluded: boolean;
    insightsIncluded: boolean;
    podContextIncluded: boolean;
}
export interface ChatSession {
    createdAt: Timestamp;
    updatedAt: Timestamp;
    title: string;
    messageCount: number;
    contextWindow: ChatSessionContext;
    status: "active" | "archived";
}
export interface PodMemberActivity {
    memberName: string;
    recentProofSummary: string;
}
export interface AnalysisContext {
    journals: JournalEntry[];
    goals: Goal | null;
    goalsConfigured: boolean;
    previousInsight: AIAnalysisResponse | null;
    podActivity: PodMemberActivity[];
    chatHistory: ChatMessage[];
    insufficientData: boolean;
    insufficientDataMessage?: string;
}
export interface ConversationMessage {
    role: "user" | "model";
    parts: Array<{
        text: string;
    }>;
}
export interface ChatRequest {
    sessionId: string | null;
    message: string;
}
export interface ChatResponse {
    sessionId: string;
    response: string;
    tokensUsed: number;
}
