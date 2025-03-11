import { PromptMetadata } from '../types';
/**
 * List directories in a given path
 */
export declare function listDirectories(dirPath: string): string[];
/**
 * List markdown files in a given path
 */
export declare function listMarkdownFiles(dirPath: string): string[];
/**
 * Get metadata from a markdown file
 */
export declare function getPromptMetadata(filePath: string): PromptMetadata;
