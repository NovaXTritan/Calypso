"use strict";
/**
 * Cosmos Cloud Functions - TypeScript entry point
 *
 * This file exports the WhatsApp notification system functions.
 * The existing JS functions in functions/index.js remain as the
 * primary entry point and re-export from this compiled output.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeJournalOnDemand = exports.journalWeeklyAnalysis = exports.journalChat = exports.journalInsight = exports.podDigest = exports.streakAlert = exports.morningRoutine = exports.whatsappWebhook = void 0;
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin if not already initialized
if (admin.apps.length === 0) {
    admin.initializeApp();
}
// Export WhatsApp notification functions
var index_1 = require("./whatsapp/index");
Object.defineProperty(exports, "whatsappWebhook", { enumerable: true, get: function () { return index_1.whatsappWebhook; } });
Object.defineProperty(exports, "morningRoutine", { enumerable: true, get: function () { return index_1.morningRoutine; } });
Object.defineProperty(exports, "streakAlert", { enumerable: true, get: function () { return index_1.streakAlert; } });
Object.defineProperty(exports, "podDigest", { enumerable: true, get: function () { return index_1.podDigest; } });
Object.defineProperty(exports, "journalInsight", { enumerable: true, get: function () { return index_1.journalInsight; } });
// Export Journal AI functions
var index_2 = require("./journal-ai/index");
Object.defineProperty(exports, "journalChat", { enumerable: true, get: function () { return index_2.journalChat; } });
Object.defineProperty(exports, "journalWeeklyAnalysis", { enumerable: true, get: function () { return index_2.journalWeeklyAnalysis; } });
Object.defineProperty(exports, "analyzeJournalOnDemand", { enumerable: true, get: function () { return index_2.analyzeJournalOnDemand; } });
//# sourceMappingURL=index.js.map