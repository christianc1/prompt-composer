import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { PromptMetadata } from '../types';

/**
 * List directories in a given path
 */
export function listDirectories(dirPath: string): string[] {
  try {
    return fs.readdirSync(dirPath)
      .filter((item: string) => {
        const itemPath = path.join(dirPath, item);
        return fs.existsSync(itemPath) && fs.statSync(itemPath).isDirectory();
      })
      .sort();
  } catch (error) {
    console.error(chalk.red(`Error reading directory ${dirPath}:`), (error as Error).message);
    return [];
  }
}

/**
 * List markdown files in a given path
 */
export function listMarkdownFiles(dirPath: string): string[] {
  try {
    return fs.readdirSync(dirPath)
      .filter((file: string) => file.endsWith('.md'))
      .sort();
  } catch (error) {
    console.error(chalk.red(`Error reading directory ${dirPath}:`), (error as Error).message);
    return [];
  }
}

/**
 * Get metadata from a markdown file
 */
export function getPromptMetadata(filePath: string): PromptMetadata {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const titleMatch = content.match(/^# (.+)$/m);
    const purposeMatch = content.match(/\*\*Purpose\*\*: (.+)$/m);
    
    return {
      title: titleMatch ? titleMatch[1] : path.basename(filePath),
      purpose: purposeMatch ? purposeMatch[1] : 'No description available'
    };
  } catch (error) {
    return {
      title: path.basename(filePath),
      purpose: 'Error reading file'
    };
  }
} 