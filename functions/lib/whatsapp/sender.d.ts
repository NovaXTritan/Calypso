/**
 * WhatsApp Cloud API message sender
 *
 * Handles both free-form (service window) and template messages.
 * Includes retry logic with exponential backoff.
 */
import { NotificationType } from "./types";
/**
 * Check if a phone number has an active 24h service window
 * (opened when user sends us a message)
 */
export declare function hasActiveServiceWindow(phone: string): Promise<boolean>;
/**
 * Open or refresh a service window for a phone number
 */
export declare function openServiceWindow(phone: string, userId: string): Promise<void>;
/**
 * Send a WhatsApp message (auto-selects template vs free-form)
 */
export declare function sendWhatsAppMessage(phone: string, userId: string, body: string, templateName: string, notificationType: NotificationType, aiPromptTokens?: number): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
}>;
/**
 * Delay helper for rate limiting between batch sends
 */
export declare function delaySend(): Promise<void>;
