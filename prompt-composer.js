#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { Select, Confirm, Input } = require('enquirer');
const chalk = require('chalk');
const ora = require('ora');

// Import the markdown preprocessor
const { processMarkdownIncludes } = require('./markdown-preprocessor');

/**
 * Clear the console
 */
function clearConsole() {
  const isWindows = process.platform === 'win32';
  if (isWindows) {
    process.stdout.write('\x1Bc');
  } else {
    process.stdout.write('\x1B[2J\x1B[0f');
  }
}

/**
 * Display a fancy header
 */
function displayHeader() {
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
 * List directories in a given path
 */
function listDirectories(dirPath) {
  try {
    return fs.readdirSync(dirPath)
      .filter(item => {
        const itemPath = path.join(dirPath, item);
        return fs.existsSync(itemPath) && fs.statSync(itemPath).isDirectory();
      })
      .sort();
  } catch (error) {
    console.error(chalk.red(`Error reading directory ${dirPath}:`), error.message);
    return [];
  }
}

/**
 * List markdown files in a given path
 */
function listMarkdownFiles(dirPath) {
  try {
    return fs.readdirSync(dirPath)
      .filter(file => file.endsWith('.md'))
      .sort();
  } catch (error) {
    console.error(chalk.red(`Error reading directory ${dirPath}:`), error.message);
    return [];
  }
}

/**
 * Copy text to clipboard
 */
function copyToClipboard(text) {
  try {
    // Create a temporary file
    const tempFile = path.join(__dirname, '.history', 'clipboard_temp.txt');
    
    // Ensure history directory exists
    const historyDir = path.join(__dirname, '.history');
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true });
    }
    
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
    console.error(chalk.red('Error copying to clipboard:'), error.message);
    return false;
  }
}

/**
 * Generate a timestamp-based filename
 */
function generateTimestampedFilename(baseFilename) {
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
function getHistoryDir() {
  const historyDir = path.join(__dirname, '.history');
  if (!fs.existsSync(historyDir)) {
    fs.mkdirSync(historyDir, { recursive: true });
  }
  return historyDir;
}

/**
 * List recent history files
 */
function listRecentHistory(limit = 10) {
  const historyDir = getHistoryDir();
  try {
    return fs.readdirSync(historyDir)
      .filter(file => file.endsWith('.md') && !file.includes('clipboard_temp'))
      .sort()
      .reverse()
      .slice(0, limit);
  } catch (error) {
    console.error(chalk.red(`Error reading history directory:`), error.message);
    return [];
  }
}

/**
 * Get metadata from a markdown file
 */
function getPromptMetadata(filePath) {
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

/**
 * Extract references from a prompt file ({{path/reference}})
 */
function extractReferences(content) {
  const referenceRegex = /\{\{([^}]+)\}\}/g;
  const references = new Set();
  let match;
  
  while ((match = referenceRegex.exec(content)) !== null) {
    references.add(match[1]);
  }
  
  return Array.from(references);
}

/**
 * Resolve a path reference
 * - If it's a specific path like modifiers.role, look for ./lib/modifiers/role
 * - If it points to a directory, prompt user to select a file
 */
async function resolveReference(reference) {
  // Determine the path to check based on the reference
  let refPath;
  
  if (reference.includes('.')) {
    // Handle dotted references like modifiers.role
    // Convert dots to path separators
    const parts = reference.split('.');
    refPath = path.join(__dirname, 'lib', ...parts);
  } else {
    // Handle simple references without dots
    refPath = path.join(__dirname, 'lib', reference);
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
 * Prompt user to select a file from a directory
 */
async function promptForFileInDirectory(dirPath, reference) {
  const files = listMarkdownFiles(dirPath);
  
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
  
  const filePrompt = new Select({
    name: 'file',
    message: message,
    choices: files.map(file => ({
      message: file.replace('.md', ''),
      value: file
    })),
    indicator(state, choice) {
      return choice.enabled ? chalk.green('›') : ' ';
    },
    pointer(state, choice) {
      return choice.enabled ? chalk.green('❯') : ' ';
    },
    highlight(state, choice) {
      return chalk.cyan(choice.message);
    }
  });
  
  const selectedFile = await filePrompt.run();
  console.log(chalk.dim(`DEBUG: Selected file: ${selectedFile}`));
  const filePath = path.join(dirPath, selectedFile.endsWith('.md') ? selectedFile : `${selectedFile}.md`);
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * Process a prompt by replacing references with file contents
 */
async function processPromptWithReferences(content) {
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
    console.error(chalk.red('Error details:'), error.message);
    throw error;
  }
}

/**
 * Debug function to log the references
 */
function debugReferences(references, contents) {
  console.log(chalk.yellow('\nDEBUG - References:'));
  for (const [reference, content] of Object.entries(contents)) {
    console.log(`${reference}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`);
  }
}

/**
 * View prompt history and allow selecting a prompt to view or copy
 */
async function viewPromptHistory() {
  try {
    console.log(chalk.dim('DEBUG: Starting viewPromptHistory function'));
    
    clearConsole();
    displayHeader();
    
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
        await mainMenu();
      } else {
        process.exit(0);
      }
      return;
    }
    
    // Format history items for display
    const historyChoices = recentHistory.map((file, index) => {
      // Extract date and original filename from the timestamped filename
      const datePart = file.substring(0, 19).replace(/_/g, ' ').replace(/-/g, ':');
      const originalName = file.substring(20);
      return {
        message: `${datePart} - ${originalName}`,
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
      indicator(state, choice) {
        return choice.enabled ? chalk.green('›') : ' ';
      },
      pointer(state, choice) {
        return choice.enabled ? chalk.green('❯') : ' ';
      },
      highlight(state, choice) {
        return chalk.cyan(choice.message);
      }
    });
    
    const selectedHistoryFile = await historyPrompt.run();
    console.log(chalk.dim(`DEBUG: Selected history file: ${selectedHistoryFile}`));
    
    if (selectedHistoryFile === 'back') {
      console.log(chalk.dim('DEBUG: Back to main menu selected'));
      await mainMenu();
      return;
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
      indicator(state, choice) {
        return choice.enabled ? chalk.green('›') : ' ';
      },
      pointer(state, choice) {
        return choice.enabled ? chalk.green('❯') : ' ';
      },
      highlight(state, choice) {
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
          indicator(state, choice) {
            return choice.enabled ? chalk.green('›') : ' ';
          },
          pointer(state, choice) {
            return choice.enabled ? chalk.green('❯') : ' ';
          },
          highlight(state, choice) {
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
          await mainMenu();
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
          indicator(state, choice) {
            return choice.enabled ? chalk.green('›') : ' ';
          },
          pointer(state, choice) {
            return choice.enabled ? chalk.green('❯') : ' ';
          },
          highlight(state, choice) {
            return chalk.cyan(choice.message);
          }
        });
        
        const afterCopyAction = await afterCopyPrompt.run();
        console.log(chalk.dim(`DEBUG: After copy action: ${afterCopyAction}`));
        
        if (afterCopyAction === 'back') {
          await viewPromptHistory();
        } else {
          await mainMenu();
        }
        break;
        
      case 'back':
      default:
        await viewPromptHistory();
        break;
    }
  } catch (error) {
    console.error(chalk.red('Error in viewPromptHistory:'), error.message);
    await viewPromptHistory();
  }
}

/**
 * Main menu for the prompt composer
 */
async function mainMenu() {
  clearConsole();
  displayHeader();
  
  try {
    const menuPrompt = new Select({
      name: 'menu',
      message: 'What would you like to do?',
      choices: [
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
      ],
      indicator(state, choice) {
        return choice.enabled ? chalk.green('›') : ' ';
      },
      pointer(state, choice) {
        return choice.enabled ? chalk.green('❯') : ' ';
      },
      highlight(state, choice) {
        return chalk.cyan(choice.message);
      }
    });
    
    const menuChoice = await menuPrompt.run();
    console.log(chalk.dim(`DEBUG: Menu choice selected: ${menuChoice}`));
    
    switch (menuChoice) {
      case 'generate':
        await generatePrompt();
        break;
      case 'history':
        await viewPromptHistory();
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
    console.error(chalk.red('Error in main menu:'), error);
    console.log(chalk.yellow('Please try again.'));
    
    // Add a small delay before restarting the menu
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mainMenu();
  }
}

/**
 * Generate a new prompt with references
 */
async function generatePrompt() {
  clearConsole();
  displayHeader();
  
  // Step 1: Select category (directory)
  const promptsDir = path.join(__dirname, 'lib', 'prompts');
  const categories = listDirectories(promptsDir);
  
  if (categories.length === 0) {
    console.log(chalk.red(`No categories found in ${promptsDir}. Please create some category directories first.`));
    return;
  }
  
  const categoryPrompt = new Select({
    name: 'category',
    message: 'Select a prompt category:',
    choices: categories.map(category => ({
      message: category,
      value: category,
      hint: `${listDirectories(path.join(promptsDir, category)).length} subcategories`
    })),
    indicator(state, choice) {
      return choice.enabled ? chalk.green('›') : ' ';
    },
    pointer(state, choice) {
      return choice.enabled ? chalk.green('❯') : ' ';
    },
    highlight(state, choice) {
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
    const subcategoryPrompt = new Select({
      name: 'subcategory',
      message: `Select a ${selectedCategory} subcategory:`,
      choices: subcategories.map(subcat => ({
        message: subcat,
        value: subcat,
        hint: `${listMarkdownFiles(path.join(categoryPath, subcat)).length} prompts`
      })),
      indicator(state, choice) {
        return choice.enabled ? chalk.green('›') : ' ';
      },
      pointer(state, choice) {
        return choice.enabled ? chalk.green('❯') : ' ';
      },
      highlight(state, choice) {
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
  const promptChoices = promptFiles.map(file => {
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
    indicator(state, choice) {
      return choice.enabled ? chalk.green('›') : ' ';
    },
    pointer(state, choice) {
      return choice.enabled ? chalk.green('❯') : ' ';
    },
    highlight(state, choice) {
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
    const references = extractReferences(promptContent);
    
    spinner.succeed(`Found ${references.length} references to process`);
    
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
    
    // Show recent history
    const recentHistory = listRecentHistory(5);
    if (recentHistory.length > 1) { // More than just the one we just created
      console.log(chalk.cyan('\nRecent prompt history:'));
      recentHistory.forEach((file, index) => {
        // Extract date and original filename from the timestamped filename
        const datePart = file.substring(0, 19).replace(/_/g, ' ').replace(/-/g, ':');
        const originalName = file.substring(20);
        console.log(`${index + 1}. ${chalk.yellow(datePart)} - ${originalName}`);
      });
      console.log(chalk.dim('\nAll history is saved in the .history directory.'));
    }
    
    // Ask if user wants to return to main menu or exit
    const nextActionPrompt = new Select({
      name: 'nextAction',
      message: 'What would you like to do next?',
      choices: [
        {
          message: 'Return to main menu',
          value: 'menu',
          hint: 'Go back to the main menu'
        },
        {
          message: 'Exit',
          value: 'exit',
          hint: 'Exit the prompt composer'
        }
      ],
      indicator(state, choice) {
        return choice.enabled ? chalk.green('›') : ' ';
      },
      pointer(state, choice) {
        return choice.enabled ? chalk.green('❯') : ' ';
      },
      highlight(state, choice) {
        return chalk.cyan(choice.message);
      }
    });
    
    const nextAction = await nextActionPrompt.run();
    console.log(chalk.dim(`DEBUG: Next action: ${nextAction}`));
    
    if (nextAction === 'menu') {
      await mainMenu();
    } else {
      console.log(chalk.cyan('\nThank you for using Prompt Composer! Goodbye.\n'));
    }
  } catch (error) {
    spinner.fail('Error processing prompt');
    console.error(chalk.red('Error details:'), error.message);
    
    // Ask if user wants to return to main menu or exit
    const errorActionPrompt = new Select({
      name: 'errorAction',
      message: 'What would you like to do next?',
      choices: [
        {
          message: 'Return to main menu',
          value: 'menu',
          hint: 'Go back to the main menu'
        },
        {
          message: 'Exit',
          value: 'exit',
          hint: 'Exit the prompt composer'
        }
      ],
      indicator(state, choice) {
        return choice.enabled ? chalk.green('›') : ' ';
      },
      pointer(state, choice) {
        return choice.enabled ? chalk.green('❯') : ' ';
      },
      highlight(state, choice) {
        return chalk.cyan(choice.message);
      }
    });
    
    const errorAction = await errorActionPrompt.run();
    console.log(chalk.dim(`DEBUG: Error action: ${errorAction}`));
    
    if (errorAction === 'menu') {
      await mainMenu();
    } else {
      console.log(chalk.cyan('\nThank you for using Prompt Composer! Goodbye.\n'));
      process.exit(0);
    }
  }
}

// Run the prompt composer
(async () => {
  try {
    await mainMenu();
  } catch (error) {
    console.error(chalk.red('An unexpected error occurred:'), error.message);
  }
})(); 