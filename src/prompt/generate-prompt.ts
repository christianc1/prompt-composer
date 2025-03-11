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
  console.log(chalk.dim(`DEBUG: Selected category: ${selectedCategory}`));
  const categoryPath = path.join(promptsDir, selectedCategory);
  
  // Step 2: Select subcategory if available
  const subcategories = listDirectories(categoryPath);
  let subcategoryPath = categoryPath;
  
  if (subcategories.length > 0) {
    const subcategoryChoices: SelectChoice[] = subcategories.map(subcat => ({
      message: subcat,
      value: subcat,
      hint: `${listMarkdownFiles(path.join(categoryPath, subcat)).length} prompts`
    }));
    
    const subcategoryPrompt = new Select({
      name: 'subcategory',
      message: `Select a ${selectedCategory} subcategory:`,
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
    console.log(chalk.dim(`DEBUG: Selected subcategory: ${selectedSubcategory}`));
    subcategoryPath = path.join(categoryPath, selectedSubcategory);
  }
  
  // Step 3: Select prompt file
  const promptFiles = listMarkdownFiles(subcategoryPath);
  
  if (promptFiles.length === 0) {
    console.log(chalk.red(`No prompt files found in ${subcategoryPath}. Please create some .md files first.`));
    return;
  }
  
  // Get metadata for each prompt file
  const promptChoices: SelectChoice[] = promptFiles.map(file => {
    const filePath = path.join(subcategoryPath, file);
    const metadata = getPromptMetadata(filePath);
    
    return {
      message: file,
      value: file,
      hint: metadata.purpose
    };
  });
  
  const promptPrompt = new Select({
    name: 'prompt',
    message: `Select a prompt:`,
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
  
  const selectedPromptFile = await promptPrompt.run();
  console.log(chalk.dim(`DEBUG: Selected prompt file: ${selectedPromptFile}`));
  const promptFilePath = path.join(subcategoryPath, selectedPromptFile);
  
  // Step 4: Read the prompt file and analyze references
  console.log(chalk.cyan(`\nProcessing ${chalk.bold(selectedPromptFile)}...\n`));
  
  const spinner = ora({
    text: 'Analyzing prompt for references...',
    spinner: 'dots'
  }).start();
  
  try {
    const promptContent = fs.readFileSync(promptFilePath, 'utf8');
    
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