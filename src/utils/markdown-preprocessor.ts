import * as fs from 'fs';
import * as path from 'path';

/**
 * Processes Markdown files with include directives
 * Syntax: <!-- @include path/to/file.md -->
 */
export function processMarkdownIncludes(filePath: string, processedFiles: Set<string> = new Set<string>()): string {
  // Prevent circular includes
  if (processedFiles.has(filePath)) {
    console.warn(`Warning: Circular include detected for ${filePath}`);
    return '';
  }
  
  processedFiles.add(filePath);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Find all include directives
    const includeRegex = /<!-- @include ([^>]+) -->/g;
    let match;
    
    while ((match = includeRegex.exec(content)) !== null) {
      const includePath = match[1].trim();
      const fullIncludePath = path.resolve(path.dirname(filePath), includePath);
      
      // Process the included file (which might have its own includes)
      const includedContent = processMarkdownIncludes(fullIncludePath, new Set(processedFiles));
      
      // Replace the include directive with the content
      content = content.replace(match[0], includedContent);
    }
    
    return content;
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, (error as Error).message);
    return `<!-- Error including ${filePath}: ${(error as Error).message} -->`;
  }
} 