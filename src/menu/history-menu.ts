import chalk from 'chalk';
// Use CommonJS require for Enquirer as it uses module.exports = Enquirer
const Enquirer = require('enquirer');
const { Select, Confirm } = Enquirer;
import * as fs from 'fs';
import * as path from 'path';

import { SelectChoice } from '../types';
import { listRecentHistory, getHistoryDir, parseHistoryItem } from '../utils/history';
import { copyToClipboard } from '../utils/clipboard';

/**
 * View prompt history and allow selecting a prompt to view or copy
 */
export async function viewPromptHistory(): Promise<void> {
  try {
    console.log(chalk.dim('DEBUG: Starting viewPromptHistory function'));
    
    console.clear();
    console.log(chalk.cyan.bold(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║                      PROMPT COMPOSER                          ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`));
    console.log(chalk.dim('Interactive tool for composing AI prompts with templates\n'));
    
    console.log(chalk.cyan.bold('Prompt History\n'));
    
    const recentHistory = listRecentHistory(10);
    console.log(chalk.dim(`DEBUG: Found ${recentHistory.length} history items`));
    
    if (recentHistory.length === 0) {
      console.log(chalk.yellow('No prompt history found.'));
      console.log(chalk.dim('Generate some prompts first to build history.'));
      
      // Ask if user wants to go back to main menu
      const backPrompt = new Confirm({
        name: 'back',
        message: 'Return to main menu?',
        initial: true
      });
      
      const shouldGoBack = await backPrompt.run();
      if (shouldGoBack) {
        console.log(chalk.dim('DEBUG: Returning to main menu'));
        return; // Return to main menu
      } else {
        process.exit(0);
      }
      return;
    }
    
    // Format history items for display
    const historyChoices: SelectChoice[] = recentHistory.map((file, index) => {
      const historyItem = parseHistoryItem(file);
      return {
        message: `${historyItem.date.toLocaleString()} - ${historyItem.originalName}`,
        value: file,
        hint: `History item #${index + 1}`
      };
    });
    
    // Add a "back to menu" option
    historyChoices.push({
      message: 'Back to main menu',
      value: 'back',
      hint: 'Return to main menu'
    });
    
    const historyPrompt = new Select({
      name: 'history',
      message: 'Select a prompt from history:',
      choices: historyChoices,
      indicator(state: any, choice: any) {
        return choice.enabled ? chalk.green('›') : ' ';
      },
      pointer(state: any, choice: any) {
        return choice.enabled ? chalk.green('❯') : ' ';
      },
      highlight(state: any, choice: any) {
        return chalk.cyan(choice.message);
      }
    });
    
    const selectedHistoryFile = await historyPrompt.run();
    console.log(chalk.dim(`DEBUG: Selected history file: ${selectedHistoryFile}`));
    
    if (selectedHistoryFile === 'back') {
      console.log(chalk.dim('DEBUG: Back to main menu selected'));
      return; // Return to main menu
    }
    
    // Read the selected prompt file
    const historyDir = getHistoryDir();
    const promptFilePath = path.join(historyDir, selectedHistoryFile);
    const promptContent = fs.readFileSync(promptFilePath, 'utf8');
    
    // Show options for the selected prompt
    const actionPrompt = new Select({
      name: 'action',
      message: 'What would you like to do with this prompt?',
      choices: [
        {
          message: 'View prompt',
          value: 'view',
          hint: 'Display the prompt content'
        },
        {
          message: 'Copy to clipboard',
          value: 'copy',
          hint: 'Copy the prompt to clipboard'
        },
        {
          message: 'Back to history',
          value: 'back',
          hint: 'Return to history list'
        }
      ],
      indicator(state: any, choice: any) {
        return choice.enabled ? chalk.green('›') : ' ';
      },
      pointer(state: any, choice: any) {
        return choice.enabled ? chalk.green('❯') : ' ';
      },
      highlight(state: any, choice: any) {
        return chalk.cyan(choice.message);
      }
    });
    
    const selectedAction = await actionPrompt.run();
    console.log(chalk.dim(`DEBUG: Selected action: ${selectedAction}`));
    
    switch (selectedAction) {
      case 'view':
        console.log('\n' + chalk.dim('─'.repeat(80)) + '\n');
        console.log(promptContent);
        console.log('\n' + chalk.dim('─'.repeat(80)) + '\n');
        
        // After viewing, ask if they want to copy or go back
        const afterViewPrompt = new Select({
          name: 'afterView',
          message: 'What would you like to do next?',
          choices: [
            {
              message: 'Copy to clipboard',
              value: 'copy',
              hint: 'Copy the prompt to clipboard'
            },
            {
              message: 'Back to history',
              value: 'back',
              hint: 'Return to history list'
            },
            {
              message: 'Main menu',
              value: 'main',
              hint: 'Return to main menu'
            }
          ],
          indicator(state: any, choice: any) {
            return choice.enabled ? chalk.green('›') : ' ';
          },
          pointer(state: any, choice: any) {
            return choice.enabled ? chalk.green('❯') : ' ';
          },
          highlight(state: any, choice: any) {
            return chalk.cyan(choice.message);
          }
        });
        
        const afterViewAction = await afterViewPrompt.run();
        console.log(chalk.dim(`DEBUG: After view action: ${afterViewAction}`));
        
        if (afterViewAction === 'copy') {
          if (copyToClipboard(promptContent)) {
            console.log(chalk.green('✓ Prompt copied to clipboard!'));
          }
          // Go back to history after copying
          await viewPromptHistory();
        } else if (afterViewAction === 'back') {
          await viewPromptHistory();
        } else {
          return; // Return to main menu
        }
        break;
        
      case 'copy':
        if (copyToClipboard(promptContent)) {
          console.log(chalk.green('✓ Prompt copied to clipboard!'));
        }
        // Ask if they want to go back to history or main menu
        const afterCopyPrompt = new Select({
          name: 'afterCopy',
          message: 'What would you like to do next?',
          choices: [
            {
              message: 'Back to history',
              value: 'back',
              hint: 'Return to history list'
            },
            {
              message: 'Main menu',
              value: 'main',
              hint: 'Return to main menu'
            }
          ],
          indicator(state: any, choice: any) {
            return choice.enabled ? chalk.green('›') : ' ';
          },
          pointer(state: any, choice: any) {
            return choice.enabled ? chalk.green('❯') : ' ';
          },
          highlight(state: any, choice: any) {
            return chalk.cyan(choice.message);
          }
        });
        
        const afterCopyAction = await afterCopyPrompt.run();
        console.log(chalk.dim(`DEBUG: After copy action: ${afterCopyAction}`));
        
        if (afterCopyAction === 'back') {
          await viewPromptHistory();
        } else {
          return; // Return to main menu
        }
        break;
        
      case 'back':
      default:
        await viewPromptHistory();
        break;
    }
  } catch (error) {
    console.error(chalk.red('Error in viewPromptHistory:'), (error as Error).message);
    await viewPromptHistory();
  }
} 