/**
 * Cosmos Cloud Functions - TypeScript entry point
 *
 * This file exports the WhatsApp notification system functions.
 * The existing JS functions in functions/index.js remain as the
 * primary entry point and re-export from this compiled output.
 */

import * as admin from "firebase-admin";

// Initialize Firebase Admin if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}

// Export WhatsApp notification functions
export {
  whatsappWebhook,
  morningRoutine,
  streakAlert,
  podDigest,
  journalInsight,
} from "./whatsapp/index";

// Export Journal AI functions
export {
  journalChat,
  journalWeeklyAnalysis,
  analyzeJournalOnDemand,
} from "./journal-ai/index";
