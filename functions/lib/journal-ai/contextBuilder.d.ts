/**
 * Context Builder for Journal AI
 *
 * Queries Firestore in parallel to assemble the full context
 * needed for Gemini chat and analysis interactions.
 */
import { AnalysisContext } from "./types";
/**
 * Build the full analysis context for a user by querying Firestore in parallel.
 *
 * @param userId - The authenticated user's ID
 * @param maxJournalEntries - Max journal entries to include (14 for chat, 30 for analysis)
 * @param sessionId - Optional chat session ID to load message history
 */
export declare function buildAnalysisContext(userId: string, maxJournalEntries?: number, sessionId?: string): Promise<AnalysisContext>;
/**
 * Check how many chat messages the user has sent today.
 * Used for rate limiting.
 */
export declare function getChatMessageCountToday(userId: string): Promise<number>;
/**
 * Count weekly analyses for rate limiting on-demand analysis.
 */
export declare function getWeeklyAnalysisCount(userId: string): Promise<number>;
