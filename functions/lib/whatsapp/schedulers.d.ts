/**
 * Scheduled Cloud Functions for WhatsApp Notifications
 *
 * Each scheduler queries eligible users, generates personalized
 * messages via Gemini, and sends them through WhatsApp.
 */
export declare const morningRoutine: import("firebase-functions/v2/scheduler").ScheduleFunction;
export declare const streakAlert: import("firebase-functions/v2/scheduler").ScheduleFunction;
export declare const podDigest: import("firebase-functions/v2/scheduler").ScheduleFunction;
export declare const journalInsight: import("firebase-functions/v2/scheduler").ScheduleFunction;
