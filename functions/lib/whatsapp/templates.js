"use strict";
/**
 * WhatsApp Message Template Definitions
 *
 * These templates must be submitted to Meta for approval
 * via the Meta Business Manager before they can be used.
 *
 * Template variables ({{1}}, {{2}}) are filled dynamically
 * by the messageGenerator at send time.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEMPLATES = void 0;
exports.seedTemplates = seedTemplates;
exports.TEMPLATES = {
    cosmos_daily_reminder: {
        name: "cosmos_daily_reminder",
        category: "UTILITY",
        language: "en",
        headerFormat: "",
        bodyFormat: "{{1}}",
    },
    cosmos_streak_alert: {
        name: "cosmos_streak_alert",
        category: "UTILITY",
        language: "en",
        headerFormat: "",
        bodyFormat: "{{1}}",
    },
    cosmos_pod_update: {
        name: "cosmos_pod_update",
        category: "UTILITY",
        language: "en",
        headerFormat: "",
        bodyFormat: "{{1}}",
    },
    cosmos_journal_insight: {
        name: "cosmos_journal_insight",
        category: "UTILITY",
        language: "en",
        headerFormat: "",
        bodyFormat: "{{1}}",
    },
    cosmos_streak_recovery: {
        name: "cosmos_streak_recovery",
        category: "MARKETING",
        language: "en",
        headerFormat: "",
        bodyFormat: "{{1}}",
    },
};
/**
 * Seed template definitions into Firestore.
 * Run once after initial setup.
 */
async function seedTemplates(db) {
    const batch = db.batch();
    for (const [id, template] of Object.entries(exports.TEMPLATES)) {
        const ref = db.collection("whatsappTemplates").doc(id);
        batch.set(ref, {
            ...template,
            status: "PENDING",
            createdAt: new Date(),
        });
    }
    await batch.commit();
    console.log(`Seeded ${Object.keys(exports.TEMPLATES).length} WhatsApp templates`);
}
//# sourceMappingURL=templates.js.map