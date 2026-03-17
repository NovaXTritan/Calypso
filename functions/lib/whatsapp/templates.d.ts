/**
 * WhatsApp Message Template Definitions
 *
 * These templates must be submitted to Meta for approval
 * via the Meta Business Manager before they can be used.
 *
 * Template variables ({{1}}, {{2}}) are filled dynamically
 * by the messageGenerator at send time.
 */
import { WhatsAppTemplate } from "./types";
export declare const TEMPLATES: Record<string, Omit<WhatsAppTemplate, "status" | "createdAt">>;
/**
 * Seed template definitions into Firestore.
 * Run once after initial setup.
 */
export declare function seedTemplates(db: FirebaseFirestore.Firestore): Promise<void>;
