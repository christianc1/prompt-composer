import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { HistoryItem } from '../types';

/**
 * Generate a timestamp-based filename
 */
export function generateTimestampedFilename(baseFilename: string): string {
  const now = new Date();
  
  // Format: YYYY-MM-DD_HH-MM-SS_originalname.md
  const timestamp = now.toISOString()
    .replace(/T/, '_')
    .replace(/\..+/, '')
    .replace(/:/g, '-');
  
  return `${timestamp}_${baseFilename}`;
}

/**
 * Get the history directory path and ensure it exists
 */
export function getHistoryDir(): string {
  const historyDir = path.join(process.cwd(), '.history');
  if (!fs.existsSync(historyDir)) {
    fs.mkdirSync(historyDir, { recursive: true });
  }
  return historyDir;
}

/**
 * List recent history files
 */
export function listRecentHistory(limit = 10): string[] {
  const historyDir = getHistoryDir();
  try {
    return fs.readdirSync(historyDir)
      .filter((file: string) => file.endsWith('.md') && !file.includes('clipboard_temp'))
      .sort()
      .reverse()
      .slice(0, limit);
  } catch (error) {
    console.error(chalk.red(`Error reading history directory:`), (error as Error).message);
    return [];
  }
}

/**
 * Parse history item from filename
 */
export function parseHistoryItem(filename: string): HistoryItem {
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