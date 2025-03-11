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
exports.processPromptWithReferences = exports.resolveReference = exports.promptForFileInDirectory = exports.extractReferences = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
// Use CommonJS require for Enquirer as it uses module.exports = Enquirer
const Enquirer = require('enquirer');
const { Select } = Enquirer;
/**
 * Extract references from a prompt file ({{path/reference}})
 */
function extractReferences(content) {
    const referenceRegex = /\{\{([^}]+)\}\}/g;
    const references = new Set();
    let match;
    while ((match = referenceRegex.exec(content)) !== null) {
        references.add(match[1]);
    }
    return Array.from(references);
}
exports.extractReferences = extractReferences;
/**
 * Prompt user to select a file from a directory
 */
async function promptForFileInDirectory(dirPath, reference) {
    const files = fs.readdirSync(dirPath)
        .filter((file) => file.endsWith('.md'))
        .sort();
    if (files.length === 0) {
        console.log(chalk_1.default.yellow(`No markdown files found in ${dirPath}.`));
        return `[No files found for: ${reference}]`;
    }
    let message = `Select a file for ${chalk_1.default.cyan(reference)}:`;
    // For specific cases, make the message more user-friendly
    if (reference.endsWith('.tone')) {
        message = 'Select a tone:';
    }
    else if (reference.endsWith('.audience')) {
        message = 'Select an audience:';
    }
    else if (reference.endsWith('.length')) {
        message = 'Select a length:';
    }
    else if (reference.includes('.templates.')) {
        message = 'Select a template:';
    }
    const choices = files.map(file => ({
        message: file.replace('.md', ''),
        value: file
    }));
    const filePrompt = new Select({
        name: 'file',
        message,
        choices,
        indicator(state, choice) {
            return choice.enabled ? chalk_1.default.green('›') : ' ';
        },
        pointer(state, choice) {
            return choice.enabled ? chalk_1.default.green('❯') : ' ';
        },
        highlight(state, choice) {
            return chalk_1.default.cyan(choice.message);
        }
    });
    const selectedFile = await filePrompt.run();
    const filePath = path.join(dirPath, selectedFile.endsWith('.md') ? selectedFile : `${selectedFile}.md`);
    return fs.readFileSync(filePath, 'utf8');
}
exports.promptForFileInDirectory = promptForFileInDirectory;
/**
 * Resolve a path reference
 * - If it's a specific path like modifiers.role, look for ./lib/modifiers/role
 * - If it points to a directory, prompt user to select a file
 */
async function resolveReference(reference) {
    // Determine the path to check based on the reference
    let refPath;
    if (reference.includes('.')) {
        // Handle dotted references like modifiers.role
        // Convert dots to path separators
        const parts = reference.split('.');
        refPath = path.join(process.cwd(), 'lib', ...parts);
    }
    else {
        // Handle simple references without dots
        refPath = path.join(process.cwd(), 'lib', reference);
    }
    // Check if the path exists
    if (fs.existsSync(refPath)) {
        const stats = fs.statSync(refPath);
        if (stats.isDirectory()) {
            // It's a directory, prompt user to select a file
            return await promptForFileInDirectory(refPath, reference);
        }
        else {
            // It's a file, read it directly
            return fs.readFileSync(refPath, 'utf8');
        }
    }
    else {
        // Check if adding .md extension makes it a valid file
        const pathWithMd = `${refPath}.md`;
        if (fs.existsSync(pathWithMd)) {
            return fs.readFileSync(pathWithMd, 'utf8');
        }
        // Path doesn't exist
        console.log(chalk_1.default.yellow(`Warning: Reference ${reference} doesn't resolve to a valid path (${refPath}).`));
        return `[Reference not found: ${reference}]`;
    }
}
exports.resolveReference = resolveReference;
/**
 * Process a prompt by replacing references with file contents
 */
async function processPromptWithReferences(content) {
    let processedContent = content;
    const references = extractReferences(content);
    // Create spinner for tracking progress
    const spinner = (0, ora_1.default)({
        text: 'Processing references...',
        spinner: 'dots'
    }).start();
    try {
        let resolvedCount = 0;
        for (const reference of references) {
            spinner.text = `Processing reference ${resolvedCount + 1}/${references.length}: ${reference}`;
            const referenceContent = await resolveReference(reference);
            const regex = new RegExp(`\\{\\{${reference.replace(/\./g, '\\.')}\\}\\}`, 'g');
            processedContent = processedContent.replace(regex, referenceContent);
            resolvedCount++;
        }
        spinner.succeed(`Processed ${references.length} references`);
        return processedContent;
    }
    catch (error) {
        spinner.fail('Error processing references');
        console.error(chalk_1.default.red('Error details:'), error.message);
        throw error;
    }
}
exports.processPromptWithReferences = processPromptWithReferences;
//# sourceMappingURL=reference-processor.js.map