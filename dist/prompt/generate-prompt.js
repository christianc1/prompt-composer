"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePrompt = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
// Use CommonJS require for Enquirer as it uses module.exports = Enquirer
const Enquirer = require('enquirer');
const { Select, Confirm } = Enquirer;
const file_1 = require("../utils/file");
const history_1 = require("../utils/history");
const clipboard_1 = require("../utils/clipboard");
const reference_processor_1 = require("../utils/reference-processor");
const markdown_preprocessor_1 = require("../utils/markdown-preprocessor");
const main_menu_1 = require("../menu/main-menu");
/**
 * Generate a new prompt with references
 */
async function generatePrompt() {
    (0, main_menu_1.displayHeader)();
    // Step 1: Select category (directory)
    const promptsDir = path.join(process.cwd(), 'lib', 'prompts');
    const categories = (0, file_1.listDirectories)(promptsDir);
    if (categories.length === 0) {
        console.log(chalk_1.default.red(`No categories found in ${promptsDir}. Please create some category directories first.`));
        return;
    }
    const categoryChoices = categories.map(category => ({
        message: category,
        value: category,
        hint: `${(0, file_1.listDirectories)(path.join(promptsDir, category)).length} subcategories`
    }));
    const categoryPrompt = new Select({
        name: 'category',
        message: 'Select a prompt category:',
        choices: categoryChoices,
        indicator(state, choice) {
            return choice.enabled ? chalk_1.default.green('›') : ' ';
        },
        pointer(state, choice) {
            return choice.enabled ? chalk_1.default.green('❯') : ' ';
        },
        highlight(state, choice) {
            return chalk_1.default.cyan(choice.message);
        }
    });
    const selectedCategory = await categoryPrompt.run();
    // Handle "back" action
    if (selectedCategory === 'back') {
        return;
    }
    // Get prompts or subcategories in the selected category
    const categoryPath = path.join(promptsDir, selectedCategory);
    const subcategories = (0, file_1.listDirectories)(categoryPath);
    // Define promptDirectory variable that will be set inside the if/else blocks
    let promptDirectory;
    if (subcategories.length > 0) {
        // If there are subcategories, prompt for selection
        const subcategoryChoices = subcategories.map(subcat => ({
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
            indicator(state, choice) {
                return choice.enabled ? chalk_1.default.green('›') : ' ';
            },
            pointer(state, choice) {
                return choice.enabled ? chalk_1.default.green('❯') : ' ';
            },
            highlight(state, choice) {
                return chalk_1.default.cyan(choice.message);
            }
        });
        const selectedSubcategory = await subcategoryPrompt.run();
        if (selectedSubcategory === 'back') {
            // If "back" was selected, restart the prompt generation process
            return await generatePrompt();
        }
        // Set the prompt directory to the selected subcategory
        promptDirectory = path.join(categoryPath, selectedSubcategory);
    }
    else {
        // If no subcategories, use the selected category as the prompt directory
        promptDirectory = categoryPath;
    }
    // List available prompt files
    const promptFiles = (0, file_1.listMarkdownFiles)(promptDirectory);
    if (promptFiles.length === 0) {
        console.log(chalk_1.default.yellow('No prompt files found in the selected directory.'));
        // Ask if user wants to try again
        const tryAgainPrompt = new Confirm({
            name: 'tryAgain',
            message: 'Would you like to try another category?',
            initial: true
        });
        if (await tryAgainPrompt.run()) {
            return await generatePrompt();
        }
        else {
            return;
        }
    }
    // Create choices for prompt files
    const promptChoices = promptFiles.map(file => {
        // Get metadata from the file
        const metadata = (0, file_1.getPromptMetadata)(path.join(promptDirectory, file));
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
        indicator(state, choice) {
            return choice.enabled ? chalk_1.default.green('›') : ' ';
        },
        pointer(state, choice) {
            return choice.enabled ? chalk_1.default.green('❯') : ' ';
        },
        highlight(state, choice) {
            return chalk_1.default.cyan(choice.message);
        }
    });
    const selectedPromptFile = await promptFilePrompt.run();
    if (selectedPromptFile === 'back') {
        return await generatePrompt();
    }
    // Step 4: Read the prompt file and analyze references
    console.log(chalk_1.default.cyan(`\nProcessing ${chalk_1.default.bold(selectedPromptFile)}...\n`));
    const spinner = (0, ora_1.default)({
        text: 'Analyzing prompt for references...',
        spinner: 'dots'
    }).start();
    try {
        const promptContent = fs.readFileSync(path.join(promptDirectory, selectedPromptFile), 'utf8');
        // Step 5: Process references and generate the final prompt
        const processedContent = await (0, reference_processor_1.processPromptWithReferences)(promptContent);
        // Step 6: Process includes (if any)
        spinner.text = 'Processing includes...';
        spinner.start();
        // Write to a temporary file for include processing
        const historyDir = (0, history_1.getHistoryDir)();
        const tempFilePath = path.join(historyDir, 'temp_processing.md');
        fs.writeFileSync(tempFilePath, processedContent);
        // Process includes
        const finalContent = (0, markdown_preprocessor_1.processMarkdownIncludes)(tempFilePath);
        // Write the final processed content with timestamp
        const timestampedFilename = (0, history_1.generateTimestampedFilename)(selectedPromptFile);
        const outputFilePath = path.join(historyDir, timestampedFilename);
        fs.writeFileSync(outputFilePath, finalContent);
        // Remove the temporary processing file
        try {
            fs.unlinkSync(tempFilePath);
        }
        catch (error) {
            // Ignore errors when removing temp file
        }
        spinner.succeed('Prompt successfully composed!');
        console.log(chalk_1.default.dim(`\nProcessed prompt saved to: ${outputFilePath}`));
        // Copy to clipboard
        if ((0, clipboard_1.copyToClipboard)(finalContent)) {
            console.log(chalk_1.default.green('✓ Prompt copied to clipboard!'));
        }
        // Ask if user wants to view the processed content
        const viewPrompt = new Confirm({
            name: 'view',
            message: 'Would you like to view the processed prompt?',
            initial: true
        });
        const shouldView = await viewPrompt.run();
        if (shouldView) {
            console.log('\n' + chalk_1.default.dim('─'.repeat(80)) + '\n');
            console.log(finalContent);
            console.log('\n' + chalk_1.default.dim('─'.repeat(80)) + '\n');
        }
        return; // Return to main menu
    }
    catch (error) {
        spinner.fail('Error processing prompt');
        console.error(chalk_1.default.red('Error details:'), error.message);
        return; // Return to main menu
    }
}
exports.generatePrompt = generatePrompt;
//# sourceMappingURL=generate-prompt.js.map