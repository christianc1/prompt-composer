/**
 * Extract references from a prompt file ({{path/reference}})
 */
export declare function extractReferences(content: string): string[];
/**
 * Prompt user to select a file from a directory
 */
export declare function promptForFileInDirectory(dirPath: string, reference: string): Promise<string>;
/**
 * Resolve a path reference
 * - If it's a specific path like modifiers.role, look for ./lib/modifiers/role
 * - If it points to a directory, prompt user to select a file
 */
export declare function resolveReference(reference: string): Promise<string>;
/**
 * Process a prompt by replacing references with file contents
 */
export declare function processPromptWithReferences(content: string): Promise<string>;
