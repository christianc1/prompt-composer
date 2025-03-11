#!/usr/bin/env node

import chalk from 'chalk';
import { mainMenu } from './menu/main-menu';

/**
 * Main entry point for the prompt composer
 */
async function main(): Promise<void> {
  try {
    await mainMenu();
  } catch (error) {
    console.error(chalk.red('An unexpected error occurred:'), (error as Error).message);
    process.exit(1);
  }
}

// Run the prompt composer
main(); 