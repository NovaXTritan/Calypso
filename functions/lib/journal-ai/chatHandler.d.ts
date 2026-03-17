/**
 * Interactive Journal AI Chatbot — Cloud Function
 *
 * HTTPS Callable function that handles conversational AI
 * interactions using Gemini with full journal context.
 */
import { ChatResponse } from "./types";
/**
 * journalChat — Interactive AI chatbot callable function
 *
 * Accepts { sessionId: string | null, message: string }
 * Returns { sessionId: string, response: string, tokensUsed: number }
 */
export declare const journalChat: import("firebase-functions/v2/https").CallableFunction<any, Promise<ChatResponse>>;
