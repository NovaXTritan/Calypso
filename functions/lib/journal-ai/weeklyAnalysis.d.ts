/**
 * Weekly Journal Analysis — Scheduled + On-Demand
 *
 * Generates structured AI insights from journal entries,
 * stores them in Firestore, and optionally sends a
 * WhatsApp summary using the existing notification system.
 */
import { Insight } from "./types";
export declare const journalWeeklyAnalysis: import("firebase-functions/v2/scheduler").ScheduleFunction;
export declare const analyzeJournalOnDemand: import("firebase-functions/v2/https").CallableFunction<any, Promise<Insight>>;
