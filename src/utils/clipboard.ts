import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { getHistoryDir } from './history';

/**
 * Copy text to clipboard
 */
export function copyToClipboard(text: string): boolean {
  try {
    // Create a temporary file
    const historyDir = getHistoryDir();
    const tempFile = path.join(historyDir, 'clipboard_temp.txt');
    
    fs.writeFileSync(tempFile, text);
    
    // Copy to clipboard based on platform
    if (process.platform === 'darwin') {
      // macOS
      execSync(`cat ${tempFile} | pbcopy`);
    } else if (process.platform === 'win32') {
      // Windows
      execSync(`type ${tempFile} | clip`);
    } else {
      // Linux (requires xclip)
      try {
        execSync(`cat ${tempFile} | xclip -selection clipboard`);
      } catch (error) {
        console.log(chalk.yellow('Could not copy to clipboard. Please install xclip or copy manually.'));
        return false;
      }
    }
    
    // Remove temporary file
    fs.unlinkSync(tempFile);
    return true;
  } catch (error) {
    console.error(chalk.red('Error copying to clipboard:'), (error as Error).message);
    return false;
  }
} 