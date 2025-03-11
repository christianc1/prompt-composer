"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mainMenu = exports.displayHeader = void 0;
const chalk_1 = __importDefault(require("chalk"));
// Use CommonJS require for Enquirer as it uses module.exports = Enquirer
const Enquirer = require('enquirer');
const { Select } = Enquirer;
const history_menu_1 = require("./history-menu");
const generate_prompt_1 = require("../prompt/generate-prompt");
/**
 * Display the header
 */
function displayHeader() {
    console.clear();
    console.log(chalk_1.default.cyan.bold(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║                      PROMPT COMPOSER                          ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`));
    console.log(chalk_1.default.dim('Interactive tool for composing AI prompts with templates\n'));
}
exports.displayHeader = displayHeader;
/**
 * Main menu for the prompt composer
 */
async function mainMenu() {
    displayHeader();
    try {
        const choices = [
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
        const menuChoice = await menuPrompt.run();
        // Process menu choice
        switch (menuChoice) {
            case 'generate':
                await (0, generate_prompt_1.generatePrompt)();
                // After generating, return to main menu
                await mainMenu();
                break;
            case 'history':
                await (0, history_menu_1.viewPromptHistory)();
                // After viewing history, return to main menu
                await mainMenu();
                break;
            case 'exit':
                console.log(chalk_1.default.blue('Goodbye! 👋'));
                process.exit(0);
                break;
            default:
                console.log(chalk_1.default.red('Invalid option selected.'));
                await mainMenu();
                break;
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('Error in main menu:'), error.message);
        console.log(chalk_1.default.yellow('Please try again.'));
        // Add a small delay before restarting the menu
        await new Promise(resolve => setTimeout(resolve, 1000));
        await mainMenu();
    }
}
exports.mainMenu = mainMenu;
//# sourceMappingURL=main-menu.js.map