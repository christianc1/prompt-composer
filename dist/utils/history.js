"use strict";
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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseHistoryItem = exports.listRecentHistory = exports.getHistoryDir = exports.generateTimestampedFilename = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const chalk_1 = __importDefault(require("chalk"));
/**
 * Generate a timestamp-based filename
 */
function generateTimestampedFilename(baseFilename) {
    const now = new Date();
    // Format: YYYY-MM-DD_HH-MM-SS_originalname.md
    const timestamp = now.toISOString()
        .replace(/T/, '_')
        .replace(/\..+/, '')
        .replace(/:/g, '-');
    return `${timestamp}_${baseFilename}`;
}
exports.generateTimestampedFilename = generateTimestampedFilename;
/**
 * Get the history directory path and ensure it exists
 */
function getHistoryDir() {
    const historyDir = path.join(process.cwd(), '.history');
    if (!fs.existsSync(historyDir)) {
        fs.mkdirSync(historyDir, { recursive: true });
    }
    return historyDir;
}
exports.getHistoryDir = getHistoryDir;
/**
 * List recent history files
 */
function listRecentHistory(limit = 10) {
    const historyDir = getHistoryDir();
    try {
        return fs.readdirSync(historyDir)
            .filter((file) => file.endsWith('.md') && !file.includes('clipboard_temp'))
            .sort()
            .reverse()
            .slice(0, limit);
    }
    catch (error) {
        console.error(chalk_1.default.red(`Error reading history directory:`), error.message);
        return [];
    }
}
exports.listRecentHistory = listRecentHistory;
/**
 * Parse history item from filename
 */
function parseHistoryItem(filename) {
    const historyDir = getHistoryDir();
    const fullPath = path.join(historyDir, filename);
    // Extract date and original filename from the timestamped filename
    const datePart = filename.substring(0, 19).replace(/_/g, 'T').replace(/-/g, ':');
    const originalName = filename.substring(20);
    return {
        filename,
        path: fullPath,
        date: new Date(datePart),
        originalName
    };
}
exports.parseHistoryItem = parseHistoryItem;
//# sourceMappingURL=history.js.map