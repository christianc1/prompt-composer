import chalk from 'chalk';
// Use CommonJS require for Enquirer as it uses module.exports = Enquirer
const Enquirer = require('enquirer');
const { Select } = Enquirer;

import { SelectChoice } from '../types';
import { viewPromptHistory } from './history-menu';
import { generatePrompt } from '../prompt/generate-prompt';

/**
 * Display the header
 */
export function displayHeader(): void {
  console.clear();
  console.log(chalk.cyan.bold(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║                      PROMPT COMPOSER                          ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`));
  console.log(chalk.dim('Interactive tool for composing AI prompts with templates\n'));
}

/**
 * Main menu for the prompt composer
 */
export async function mainMenu(): Promise<void> {
  displayHeader();
  
  try {
    const choices: SelectChoice[] = [
      {
        message: 'Generate a prompt',
        value: 'generate',
        hint: 'Create a new prompt with references'
      },
      {
        message: 'View prompt history',
        value: 'history',
        hint: 'See previous prompts you\'ve generated'
      },
      {
        message: 'Exit',
        value: 'exit',
        hint: 'Exit the prompt composer'
      }
    ];
    
    const menuPrompt = new Select({
      name: 'menu',
      message: 'What would you like to do?',
      choices,
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
    
    const menuChoice = await menuPrompt.run();
    console.log(chalk.dim(`DEBUG: Menu choice selected: ${menuChoice}`));
    
    switch (menuChoice) {
      case 'generate':
        await generatePrompt();
        // After generating, return to main menu
        await mainMenu();
        break;
      case 'history':
        await viewPromptHistory();
        // After viewing history, return to main menu
        await mainMenu();
        break;
      case 'exit':
        console.log(chalk.cyan('\nThank you for using Prompt Composer! Goodbye.\n'));
        process.exit(0);
        break;
      default:
        console.log(chalk.yellow(`Invalid selection: ${menuChoice}. Please try again.`));
        await mainMenu();
        break;
    }
  } catch (error) {
    console.error(chalk.red('Error in main menu:'), (error as Error).message);
    console.log(chalk.yellow('Please try again.'));
    
    // Add a small delay before restarting the menu
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mainMenu();
  }
} 