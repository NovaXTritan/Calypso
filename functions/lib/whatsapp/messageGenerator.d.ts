/**
 * AI Message Generator
 *
 * Uses Gemini Flash API to generate deeply personalized WhatsApp notifications
 * based on aggregated user context.
 */
import { UserContext, NotificationType, FormattedMessage } from "./types";
/**
 * Generate a personalized WhatsApp message using Gemini AI
 */
export declare function generateMessage(context: UserContext, notificationType: NotificationType): Promise<FormattedMessage & {
    promptTokens: number;
}>;
