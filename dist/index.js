#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const main_menu_1 = require("./menu/main-menu");
/**
 * Main entry point for the prompt composer
 */
async function main() {
    try {
        await (0, main_menu_1.mainMenu)();
    }
    catch (error) {
        console.error(chalk_1.default.red('An unexpected error occurred:'), error.message);
        process.exit(1);
    }
}
// Run the prompt composer
main();
//# sourceMappingURL=index.js.map