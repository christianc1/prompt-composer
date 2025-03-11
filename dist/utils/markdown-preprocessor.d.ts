/**
 * Processes Markdown files with include directives
 * Syntax: <!-- @include path/to/file.md -->
 */
export declare function processMarkdownIncludes(filePath: string, processedFiles?: Set<string>): string;
