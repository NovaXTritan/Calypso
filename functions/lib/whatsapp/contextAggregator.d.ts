/**
 * Context Aggregator
 *
 * Pulls all relevant user context from Firestore in parallel
 * to build a rich UserContext object for AI message generation.
 */
import { UserContext } from "./types";
/**
 * Aggregate all context for a user from Firestore.
 * Uses Promise.all for parallel queries.
 */
export declare function aggregateUserContext(userId: string): Promise<UserContext | null>;
