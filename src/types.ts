// We'll use our own definitions since enquirer's type definitions have a different structure
// than what we're currently using in the codebase
export interface Choice {
  name?: string;
  message?: string;
  value?: any;
  hint?: string;
  disabled?: boolean | string;
  selected?: boolean;
}

export interface HistoryItem {
  filename: string;
  path: string;
  date: Date;
  originalName: string;
}

export interface SelectChoice extends Choice {
  message: string;
  value: string;
  hint?: string;
}

export interface PromptMetadata {
  title: string;
  purpose: string;
} 