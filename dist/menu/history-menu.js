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
exports.viewPromptHistory = void 0;
const chalk_1 = __importDefault(require("chalk"));
// Use CommonJS require for Enquirer as it uses module.exports = Enquirer
const Enquirer = require('enquirer');
const { Select, Confirm } = Enquirer;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const history_1 = require("../utils/history");
const clipboard_1 = require("../utils/clipboard");
/**
 * View prompt history and allow selecting a prompt to view or copy
 */
async function viewPromptHistory() {
    try {
        console.log(chalk_1.default.dim('DEBUG: Starting viewPromptHistory function'));
        console.clear();
        console.log(chalk_1.default.cyan.bold(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║                      PROMPT COMPOSER                          ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`));
        console.log(chalk_1.default.dim('Interactive tool for composing AI prompts with templates\n'));
        console.log(chalk_1.default.cyan.bold('Prompt History\n'));
        const recentHistory = (0, history_1.listRecentHistory)(10);
        console.log(chalk_1.default.dim(`DEBUG: Found ${recentHistory.length} history items`));
        if (recentHistory.length === 0) {
            console.log(chalk_1.default.yellow('No prompt history found.'));
            console.log(chalk_1.default.dim('Generate some prompts first to build history.'));
            // Ask if user wants to go back to main menu
            const backPrompt = new Confirm({
                name: 'back',
                message: 'Return to main menu?',
                initial: true
            });
            const shouldGoBack = await backPrompt.run();
            if (shouldGoBack) {
                console.log(chalk_1.default.dim('DEBUG: Returning to main menu'));
                return; // Return to main menu
            }
            else {
                process.exit(0);
            }
            return;
        }
        // Format history items for display
        const historyChoices = recentHistory.map((file, index) => {
            const historyItem = (0, history_1.parseHistoryItem)(file);
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
        const selectedHistoryFile = await historyPrompt.run();
        console.log(chalk_1.default.dim(`DEBUG: Selected history file: ${selectedHistoryFile}`));
        if (selectedHistoryFile === 'back') {
            console.log(chalk_1.default.dim('DEBUG: Back to main menu selected'));
            return; // Return to main menu
        }
        // Read the selected prompt file
        const historyDir = (0, history_1.getHistoryDir)();
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
                return choice.enabled ? chalk_1.default.green('›') : ' ';
            },
            pointer(state, choice) {
                return choice.enabled ? chalk_1.default.green('❯') : ' ';
            },
            highlight(state, choice) {
                return chalk_1.default.cyan(choice.message);
            }
        });
        const selectedAction = await actionPrompt.run();
        console.log(chalk_1.default.dim(`DEBUG: Selected action: ${selectedAction}`));
        switch (selectedAction) {
            case 'view':
                console.log('\n' + chalk_1.default.dim('─'.repeat(80)) + '\n');
                console.log(promptContent);
                console.log('\n' + chalk_1.default.dim('─'.repeat(80)) + '\n');
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
                        return choice.enabled ? chalk_1.default.green('›') : ' ';
                    },
                    pointer(state, choice) {
                        return choice.enabled ? chalk_1.default.green('❯') : ' ';
                    },
                    highlight(state, choice) {
                        return chalk_1.default.cyan(choice.message);
                    }
                });
                const afterViewAction = await afterViewPrompt.run();
                console.log(chalk_1.default.dim(`DEBUG: After view action: ${afterViewAction}`));
                if (afterViewAction === 'copy') {
                    if ((0, clipboard_1.copyToClipboard)(promptContent)) {
                        console.log(chalk_1.default.green('✓ Prompt copied to clipboard!'));
                    }
                    // Go back to history after copying
                    await viewPromptHistory();
                }
                else if (afterViewAction === 'back') {
                    await viewPromptHistory();
                }
                else {
                    return; // Return to main menu
                }
                break;
            case 'copy':
                if ((0, clipboard_1.copyToClipboard)(promptContent)) {
                    console.log(chalk_1.default.green('✓ Prompt copied to clipboard!'));
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
                        return choice.enabled ? chalk_1.default.green('›') : ' ';
                    },
                    pointer(state, choice) {
                        return choice.enabled ? chalk_1.default.green('❯') : ' ';
                    },
                    highlight(state, choice) {
                        return chalk_1.default.cyan(choice.message);
                    }
                });
                const afterCopyAction = await afterCopyPrompt.run();
                console.log(chalk_1.default.dim(`DEBUG: After copy action: ${afterCopyAction}`));
                if (afterCopyAction === 'back') {
                    await viewPromptHistory();
                }
                else {
                    return; // Return to main menu
                }
                break;
            case 'back':
            default:
                await viewPromptHistory();
                break;
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('Error in viewPromptHistory:'), error.message);
        await viewPromptHistory();
    }
}
exports.viewPromptHistory = viewPromptHistory;
//# sourceMappingURL=history-menu.js.map