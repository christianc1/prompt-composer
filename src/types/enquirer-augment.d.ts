import 'enquirer';

// Augment Enquirer's types to match our usage patterns
declare module 'enquirer' {
  // Add our own styling methods that might be missing in the original types
  interface Prompt {
    indicator?(state: any, choice: any): string;
    pointer?(state: any, choice: any): string;
    highlight?(state: any, choice: any): string;
  }
} 