#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Test function to process modifiers
function processModifiers(content, modifiers, selfValues) {
  let processedContent = content;
  
  // Replace modifiers
  for (const [key, value] of Object.entries(modifiers)) {
    const regex = new RegExp(`\\{\\{modifiers\\.${key}\\}\\}`, 'g');
    processedContent = processedContent.replace(regex, value);
  }
  
  // Replace self references
  for (const [key, value] of Object.entries(selfValues)) {
    const regex = new RegExp(`\\{\\{self\\.${key}\\}\\}`, 'g');
    processedContent = processedContent.replace(regex, value);
  }
  
  return processedContent;
}

// Test with a sample prompt
const promptPath = path.join(__dirname, 'prompts', 'agenda', 'standup', 'default.md');
const rolePath = path.join(__dirname, 'modifiers', 'role', 'meeting-facilitator.md');
const tonePath = path.join(__dirname, 'modifiers', 'tone', 'professional.md');
const audiencePath = path.join(__dirname, 'modifiers', 'audience', 'executive.md');
const lengthPath = path.join(__dirname, 'modifiers', 'length', 'brief.md');
const templatePath = path.join(__dirname, 'templates', 'tmpl_status_report.md');

try {
  // Read files
  const promptContent = fs.readFileSync(promptPath, 'utf8');
  const roleContent = fs.readFileSync(rolePath, 'utf8');
  const toneContent = fs.readFileSync(tonePath, 'utf8');
  const audienceContent = fs.readFileSync(audiencePath, 'utf8');
  const lengthContent = fs.readFileSync(lengthPath, 'utf8');
  const templateContent = fs.readFileSync(templatePath, 'utf8');
  
  // Set up modifiers and self values
  const modifiers = {
    role: roleContent,
    tone: toneContent,
    audience: audienceContent,
    length: lengthContent
  };
  
  const selfValues = {
    templates: templateContent
  };
  
  // Process the prompt
  const processedContent = processModifiers(promptContent, modifiers, selfValues);
  
  // Output the results
  console.log('=== ORIGINAL PROMPT ===');
  console.log(promptContent);
  
  console.log('\n=== MODIFIERS ===');
  for (const [key, value] of Object.entries(modifiers)) {
    console.log(`\n--- ${key.toUpperCase()} ---`);
    console.log(value);
  }
  
  console.log('\n=== SELF VALUES ===');
  for (const [key, value] of Object.entries(selfValues)) {
    console.log(`\n--- ${key.toUpperCase()} ---`);
    console.log(value);
  }
  
  console.log('\n=== PROCESSED CONTENT ===');
  console.log(processedContent);
  
  // Write the processed content to a file
  const outputPath = path.join(__dirname, 'temp', 'test_output.md');
  
  // Create temp directory if it doesn't exist
  const tempDir = path.join(__dirname, 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }
  
  fs.writeFileSync(outputPath, processedContent);
  console.log(`\nProcessed content written to: ${outputPath}`);
} catch (error) {
  console.error('Error:', error.message);
} 