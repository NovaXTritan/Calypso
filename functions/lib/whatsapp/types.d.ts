/**
 * TypeScript interfaces for the Cosmos WhatsApp Notification System
 */
export interface NotificationPreferences {
    morningRoutine: boolean;
    streakAlerts: boolean;
    podUpdates: boolean;
    learningNudges: boolean;
    journalInsights: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
    timezone: string;
}
export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    photoURL: string | null;
    bio: string;
    goals: string[];
    joinedPods: string[];
    streak: number;
    totalProofs: number;
    phone?: string;
    whatsappOptIn?: boolean;
    notificationPreferences?: NotificationPreferences;
    lastWhatsAppMessageAt?: FirebaseFirestore.Timestamp;
    preferences?: {
        theme: string;
        emailNotifications: boolean;
        publicProfile: boolean;
    };
}
export interface ProofData {
    id: string;
    content: string;
    podSlug: string;
    authorId: string;
    type: string;
    createdAt: number;
}
export interface PodMemberActivity {
    displayName: string;
    lastProofContent: string | null;
    lastProofAt: number | null;
    streak: number;
}
export interface PodContext {
    podSlug: string;
    podName: string;
    memberActivity: PodMemberActivity[];
    totalProofsLast24h: number;
}
export interface JournalEntry {
    content: string;
    mood: string | null;
    createdAt: number;
}
export interface StreakData {
    currentStreak: number;
    longestStreak: number;
    lastProofAt: number | null;
    todayProofSubmitted: boolean;
}
export interface NotificationHistoryItem {
    type: string;
    messagePreview: string;
    sentAt: FirebaseFirestore.Timestamp;
}
export interface UserContext {
    user: UserProfile;
    streakData: StreakData;
    pods: PodContext[];
    journalEntries: JournalEntry[];
    recentNotifications: NotificationHistoryItem[];
    todayProofs: ProofData[];
}
export type NotificationType = "morning_routine" | "streak_alert" | "pod_update" | "learning_nudge" | "journal_insight" | "project_reminder";
export interface AIResponse {
    header: string;
    importance: string;
    problemStatement: string;
    input: string;
    process: string;
    expectedOutcome: string;
    podContext: string;
}
export interface FormattedMessage {
    header: string;
    body: string;
}
export interface ServiceWindow {
    openedAt: FirebaseFirestore.Timestamp;
    expiresAt: FirebaseFirestore.Timestamp;
    userId: string;
}
export interface WhatsAppTemplateMessage {
    messaging_product: "whatsapp";
    to: string;
    type: "template";
    template: {
        name: string;
        language: {
            code: string;
        };
        components: Array<{
            type: string;
            parameters: Array<{
                type: string;
                text: string;
            }>;
        }>;
    };
}
export interface WhatsAppTextMessage {
    messaging_product: "whatsapp";
    to: string;
    type: "text";
    text: {
        preview_url: boolean;
        body: string;
    };
}
export interface WhatsAppAPIResponse {
    messaging_product: string;
    contacts: Array<{
        input: string;
        wa_id: string;
    }>;
    messages: Array<{
        id: string;
    }>;
}
export type NotificationStatus = "queued" | "sent" | "delivered" | "read" | "failed";
export type CostCategory = "utility" | "marketing" | "free_window";
export interface NotificationLog {
    userId: string;
    type: NotificationType;
    waMessageId: string;
    status: NotificationStatus;
    templateUsed: string;
    costCategory: CostCategory;
    aiPromptTokens: number;
    messagePreview: string;
    sentAt: FirebaseFirestore.Timestamp;
    updatedAt: FirebaseFirestore.Timestamp;
}
export interface WhatsAppTemplate {
    name: string;
    category: "UTILITY" | "MARKETING";
    language: string;
    headerFormat: string;
    bodyFormat: string;
    status: "APPROVED" | "PENDING" | "REJECTED";
    createdAt: FirebaseFirestore.Timestamp;
}
export interface WebhookEntry {
    id: string;
    changes: Array<{
        value: {
            messaging_product: string;
            metadata: {
                display_phone_number: string;
                phone_number_id: string;
            };
            messages?: Array<{
                from: string;
                id: string;
                timestamp: string;
                text?: {
                    body: string;
                };
                type: string;
            }>;
            statuses?: Array<{
                id: string;
                status: "sent" | "delivered" | "read" | "failed";
                timestamp: string;
                recipient_id: string;
                errors?: Array<{
                    code: number;
                    title: string;
                }>;
            }>;
        };
        field: string;
    }>;
}
export interface WebhookPayload {
    object: string;
    entry: WebhookEntry[];
}
