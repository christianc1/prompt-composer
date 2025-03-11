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
Object.defineProperty(exports, "__esModule", { value: true });
exports.processMarkdownIncludes = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Processes Markdown files with include directives
 * Syntax: <!-- @include path/to/file.md -->
 */
function processMarkdownIncludes(filePath, processedFiles = new Set()) {
    // Prevent circular includes
    if (processedFiles.has(filePath)) {
        console.warn(`Warning: Circular include detected for ${filePath}`);
        return '';
    }
    processedFiles.add(filePath);
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        // Find all include directives
        const includeRegex = /<!-- @include ([^>]+) -->/g;
        let match;
        while ((match = includeRegex.exec(content)) !== null) {
            const includePath = match[1].trim();
            const fullIncludePath = path.resolve(path.dirname(filePath), includePath);
            // Process the included file (which might have its own includes)
            const includedContent = processMarkdownIncludes(fullIncludePath, new Set(processedFiles));
            // Replace the include directive with the content
            content = content.replace(match[0], includedContent);
        }
        return content;
    }
    catch (error) {
        console.error(`Error processing file ${filePath}:`, error.message);
        return `<!-- Error including ${filePath}: ${error.message} -->`;
    }
}
exports.processMarkdownIncludes = processMarkdownIncludes;
//# sourceMappingURL=markdown-preprocessor.js.map