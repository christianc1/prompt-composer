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
exports.getPromptMetadata = exports.listMarkdownFiles = exports.listDirectories = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const chalk_1 = __importDefault(require("chalk"));
/**
 * List directories in a given path
 */
function listDirectories(dirPath) {
    try {
        return fs.readdirSync(dirPath)
            .filter((item) => {
            const itemPath = path.join(dirPath, item);
            return fs.existsSync(itemPath) && fs.statSync(itemPath).isDirectory();
        })
            .sort();
    }
    catch (error) {
        console.error(chalk_1.default.red(`Error reading directory ${dirPath}:`), error.message);
        return [];
    }
}
exports.listDirectories = listDirectories;
/**
 * List markdown files in a given path
 */
function listMarkdownFiles(dirPath) {
    try {
        return fs.readdirSync(dirPath)
            .filter((file) => file.endsWith('.md'))
            .sort();
    }
    catch (error) {
        console.error(chalk_1.default.red(`Error reading directory ${dirPath}:`), error.message);
        return [];
    }
}
exports.listMarkdownFiles = listMarkdownFiles;
/**
 * Get metadata from a markdown file
 */
function getPromptMetadata(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const titleMatch = content.match(/^# (.+)$/m);
        const purposeMatch = content.match(/\*\*Purpose\*\*: (.+)$/m);
        return {
            title: titleMatch ? titleMatch[1] : path.basename(filePath),
            purpose: purposeMatch ? purposeMatch[1] : 'No description available'
        };
    }
    catch (error) {
        return {
            title: path.basename(filePath),
            purpose: 'Error reading file'
        };
    }
}
exports.getPromptMetadata = getPromptMetadata;
//# sourceMappingURL=file.js.map