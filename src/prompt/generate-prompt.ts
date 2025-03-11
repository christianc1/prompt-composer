import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
// Use CommonJS require for Enquirer as it uses module.exports = Enquirer
const Enquirer = require('enquirer');
const { Select, Confirm } = Enquirer;

import { SelectChoice } from '../types';
import { listDirectories, listMarkdownFiles, getPromptMetadata } from '../utils/file';
import { getHistoryDir, generateTimestampedFilename } from '../utils/history';
import { copyToClipboard } from '../utils/clipboard';
import { processPromptWithReferences } from '../utils/reference-processor';
import { processMarkdownIncludes } from '../utils/markdown-preprocessor';
import { displayHeader } from '../menu/main-menu';

/**
 * Generate a new prompt with references
 */
export async function generatePrompt(): Promise<void> {
  displayHeader();
  
  // Step 1: Select category (directory)
  const promptsDir = path.join(process.cwd(), 'lib', 'prompts');
  const categories = listDirectories(promptsDir);
  
  if (categories.length === 0) {
    console.log(chalk.red(`No categories found in ${promptsDir}. Please create some category directories first.`));
    return;
  }
  
  const categoryChoices: SelectChoice[] = categories.map(category => ({
    message: category,
    value: category,
    hint: `${listDirectories(path.join(promptsDir, category)).length} subcategories`
  }));
  
  const categoryPrompt = new Select({
    name: 'category',
    message: 'Select a prompt category:',
    choices: categoryChoices,
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
  
  const selectedCategory = await categoryPrompt.run();
  
  // Handle "back" action
  if (selectedCategory === 'back') {
    return;
  }
  
  // Get prompts or subcategories in the selected category
  const categoryPath = path.join(promptsDir, selectedCategory);
  const subcategories = listDirectories(categoryPath);
  
  // Define promptDirectory variable that will be set inside the if/else blocks
  let promptDirectory: string;
  
  if (subcategories.length > 0) {
    // If there are subcategories, prompt for selection
    const subcategoryChoices: SelectChoice[] = subcategories.map(subcat => ({
      message: subcat,
      value: subcat
    }));
    
    // Add a "back" option
    subcategoryChoices.push({
      message: 'Back to categories',
      value: 'back'
    });
    
    const subcategoryPrompt = new Select({
      name: 'subcategory',
      message: 'Select a subcategory:',
      choices: subcategoryChoices,
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
    
    const selectedSubcategory = await subcategoryPrompt.run();
    
    if (selectedSubcategory === 'back') {
      // If "back" was selected, restart the prompt generation process
      return await generatePrompt();
    }
    
    // Set the prompt directory to the selected subcategory
    promptDirectory = path.join(categoryPath, selectedSubcategory);
  } else {
    // If no subcategories, use the selected category as the prompt directory
    promptDirectory = categoryPath;
  }
  
  // List available prompt files
  const promptFiles = listMarkdownFiles(promptDirectory);
  
  if (promptFiles.length === 0) {
    console.log(chalk.yellow('No prompt files found in the selected directory.'));
    
    // Ask if user wants to try again
    const tryAgainPrompt = new Confirm({
      name: 'tryAgain',
      message: 'Would you like to try another category?',
      initial: true
    });
    
    if (await tryAgainPrompt.run()) {
      return await generatePrompt();
    } else {
      return;
    }
  }
  
  // Create choices for prompt files
  const promptChoices: SelectChoice[] = promptFiles.map(file => {
    // Get metadata from the file
    const metadata = getPromptMetadata(path.join(promptDirectory, file));
    return {
      message: metadata.title || file.replace('.md', ''),
      value: file,
      hint: metadata.purpose || ''
    };
  });
  
  // Add a "back" option
  promptChoices.push({
    message: 'Back',
    value: 'back'
  });
  
  // Prompt for selecting a prompt file
  const promptFilePrompt = new Select({
    name: 'promptFile',
    message: 'Select a prompt file:',
    choices: promptChoices,
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
  
  const selectedPromptFile = await promptFilePrompt.run();
  
  if (selectedPromptFile === 'back') {
    return await generatePrompt();
  }
  
  // Step 4: Read the prompt file and analyze references
  console.log(chalk.cyan(`\nProcessing ${chalk.bold(selectedPromptFile)}...\n`));
  
  const spinner = ora({
    text: 'Analyzing prompt for references...',
    spinner: 'dots'
  }).start();
  
  try {
    const promptContent = fs.readFileSync(path.join(promptDirectory, selectedPromptFile), 'utf8');
    
    // Step 5: Process references and generate the final prompt
    const processedContent = await processPromptWithReferences(promptContent);
    
    // Step 6: Process includes (if any)
    spinner.text = 'Processing includes...';
    spinner.start();
    
    // Write to a temporary file for include processing
    const historyDir = getHistoryDir();
    const tempFilePath = path.join(historyDir, 'temp_processing.md');
    fs.writeFileSync(tempFilePath, processedContent);
    
    // Process includes
    const finalContent = processMarkdownIncludes(tempFilePath);
    
    // Write the final processed content with timestamp
    const timestampedFilename = generateTimestampedFilename(selectedPromptFile);
    const outputFilePath = path.join(historyDir, timestampedFilename);
    fs.writeFileSync(outputFilePath, finalContent);
    
    // Remove the temporary processing file
    try {
      fs.unlinkSync(tempFilePath);
    } catch (error) {
      // Ignore errors when removing temp file
    }
    
    spinner.succeed('Prompt successfully composed!');
    
    console.log(chalk.dim(`\nProcessed prompt saved to: ${outputFilePath}`));
    
    // Copy to clipboard
    if (copyToClipboard(finalContent)) {
      console.log(chalk.green('✓ Prompt copied to clipboard!'));
    }
    
    // Ask if user wants to view the processed content
    const viewPrompt = new Confirm({
      name: 'view',
      message: 'Would you like to view the processed prompt?',
      initial: true
    });
    
    const shouldView = await viewPrompt.run();
    
    if (shouldView) {
      console.log('\n' + chalk.dim('─'.repeat(80)) + '\n');
      console.log(finalContent);
      console.log('\n' + chalk.dim('─'.repeat(80)) + '\n');
    }
    
    return; // Return to main menu
  } catch (error) {
    spinner.fail('Error processing prompt');
    console.error(chalk.red('Error details:'), (error as Error).message);
    return; // Return to main menu
  }
} 