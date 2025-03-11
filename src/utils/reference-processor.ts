import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
// Use CommonJS require for Enquirer as it uses module.exports = Enquirer
const Enquirer = require('enquirer');
const { Select } = Enquirer;
import { SelectChoice } from '../types';
import { listDirectories, listMarkdownFiles } from './file';

/**
 * Extract references from a prompt file ({{path/reference}})
 */
export function extractReferences(content: string): string[] {
  const referenceRegex = /\{\{([^}]+)\}\}/g;
  const references = new Set<string>();
  let match;
  
  while ((match = referenceRegex.exec(content)) !== null) {
    references.add(match[1]);
  }
  
  return Array.from(references);
}

/**
 * Prompt user to select a file from a directory
 */
export async function promptForFileInDirectory(dirPath: string, reference: string): Promise<string> {
  const files = fs.readdirSync(dirPath)
    .filter((file: string) => file.endsWith('.md'))
    .sort();
  
  if (files.length === 0) {
    console.log(chalk.yellow(`No markdown files found in ${dirPath}.`));
    return `[No files found for: ${reference}]`;
  }
  
  let message = `Select a file for ${chalk.cyan(reference)}:`;
  // For specific cases, make the message more user-friendly
  if (reference.endsWith('.tone')) {
    message = 'Select a tone:';
  } else if (reference.endsWith('.audience')) {
    message = 'Select an audience:';
  } else if (reference.endsWith('.length')) {
    message = 'Select a length:';
  } else if (reference.includes('.templates.')) {
    message = 'Select a template:';
  }
  
  const choices: SelectChoice[] = files.map(file => ({
    message: file.replace('.md', ''),
    value: file
  }));
  
  const filePrompt = new Select({
    name: 'file',
    message,
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
  
  const selectedFile = await filePrompt.run();
  const filePath = path.join(dirPath, selectedFile.endsWith('.md') ? selectedFile : `${selectedFile}.md`);
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * Resolve a path reference
 * - If it's a specific path like modifiers.role, look for ./lib/modifiers/role
 * - If it points to a directory, prompt user to select a file
 */
export async function resolveReference(reference: string): Promise<string> {
  // Determine the path to check based on the reference
  let refPath: string;
  
  if (reference.includes('.')) {
    // Handle dotted references like modifiers.role
    // Convert dots to path separators
    const parts = reference.split('.');
    refPath = path.join(process.cwd(), 'lib', ...parts);
  } else {
    // Handle simple references without dots
    refPath = path.join(process.cwd(), 'lib', reference);
  }
  
  // Check if the path exists
  if (fs.existsSync(refPath)) {
    const stats = fs.statSync(refPath);
    
    if (stats.isDirectory()) {
      // It's a directory, prompt user to select a file
      return await promptForFileInDirectory(refPath, reference);
    } else {
      // It's a file, read it directly
      return fs.readFileSync(refPath, 'utf8');
    }
  } else {
    // Check if adding .md extension makes it a valid file
    const pathWithMd = `${refPath}.md`;
    if (fs.existsSync(pathWithMd)) {
      return fs.readFileSync(pathWithMd, 'utf8');
    }
    
    // Path doesn't exist
    console.log(chalk.yellow(`Warning: Reference ${reference} doesn't resolve to a valid path (${refPath}).`));
    return `[Reference not found: ${reference}]`;
  }
}

/**
 * Process a prompt by replacing references with file contents
 */
export async function processPromptWithReferences(content: string): Promise<string> {
  let processedContent = content;
  const references = extractReferences(content);
  
  // Create spinner for tracking progress
  const spinner = ora({
    text: 'Processing references...',
    spinner: 'dots'
  }).start();
  
  try {
    let resolvedCount = 0;
    for (const reference of references) {
      spinner.text = `Processing reference ${resolvedCount + 1}/${references.length}: ${reference}`;
      
      const referenceContent = await resolveReference(reference);
      const regex = new RegExp(`\\{\\{${reference.replace(/\./g, '\\.')}\\}\\}`, 'g');
      processedContent = processedContent.replace(regex, referenceContent);
      
      resolvedCount++;
    }
    
    spinner.succeed(`Processed ${references.length} references`);
    return processedContent;
  } catch (error) {
    spinner.fail('Error processing references');
    console.error(chalk.red('Error details:'), (error as Error).message);
    throw error;
  }
}