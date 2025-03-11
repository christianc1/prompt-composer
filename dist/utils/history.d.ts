import { HistoryItem } from '../types';
/**
 * Generate a timestamp-based filename
 */
export declare function generateTimestampedFilename(baseFilename: string): string;
/**
 * Get the history directory path and ensure it exists
 */
export declare function getHistoryDir(): string;
/**
 * List recent history files
 */
export declare function listRecentHistory(limit?: number): string[];
/**
 * Parse history item from filename
 */
export declare function parseHistoryItem(filename: string): HistoryItem;
