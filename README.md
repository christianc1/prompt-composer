# Christian's Repository of AI Prompts and Instruction Sets

## Overview

This is a repository of markdown files that serve as a central store of AI Agent instructions, prompts, and prompt templates to improve the quality of AI responses. Leveraging these authored prompts reduce the effort required to craft comprehensive prompts with sufficient context for generative AI to improve the quality of responses.

## Directory Structure

The repository follows a specific structure:

- `/lib/prompts/` - Prompt templates organized by category
- `/lib/modifiers/` - Snippets that can modify the prompt to affect output.  Useful for things like "audience" or "tone"
- `/lib/templates/` - Output format templates
- `/.history/` - Automatically generated directory that stores all composed prompts with timestamps

## Path References

Prompts can include special path references that will be replaced during composition, allowing you inject extra context, like the role a the AI Agent should adopt, or the audience for which the output should be written for:

- `{{path/to/file}}` - Will be replaced with the content of the referenced file
- `{{part1.part2.part3}}` - Each dot represents a directory separator, resolving to `lib/part1/part2/part3`
- If the path points to a directory, you'll be prompted to select a file within it

### Examples

- `{{modifiers.role/project-manager}}` - Content from lib/role/project-manager.md
- `{{modifiers.tone}}` - Prompts for selection from lib/modifiers/tone directory
- `{{modifiers.audience}}` - Prompts for selection from lib/modifiers/audience directory
- `{{templates.meeting}}` - Content from lib/templates/meeting.md or selection from that directory

## Instructions

Files in the `/instructions` directory are meant to tailor the behavior of an AI agent.  Use them to set things like *Tone* *Audience* *Act As* to customize the type of responses an AI Agent provides.

## Prompts

Files in the `/prompts` directory are meant to provide common prompts that can be submitted to an AI agent.  These are initial prompts for things like generating emails, generating ticket updates, generating feedback, etc.

## Templates

Files in the `/templates` directory can be provided to AI Agents to help them understand the intended structure for a part or whole of the desired response.

## Modifiers

Files in the `/modifiers` directory contain reusable content that can be injected into prompts. They are organized by type:

- `/modifiers/tone/` - Different tone settings (professional, friendly, urgent, etc.)
- `/modifiers/role/` - Different roles for the AI to adopt (meeting facilitator, code reviewer, etc.)
- `/modifiers/audience/` - Different target audiences for the response
- `/modifiers/length/` - Different length specifications

## Prompt Composer CLI Tool

This repository includes an interactive command-line tool called `prompt-composer` that helps you select and compose prompts with dynamic content injection.

### Installation

### Local Development Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/prompts.git
cd prompts

# Install dependencies
npm install

# Build and set up local binary
npm run setup

# Add the local-bin to your PATH for this session
export PATH="$(pwd)/local-bin:$PATH"

# Now you can run the prompt composer from anywhere
prompt-composer
```

### Global Installation (requires admin privileges)

```bash
# Clone the repository
git clone https://github.com/yourusername/prompts.git
cd prompts

# Install dependencies
npm install

# Build and install globally (requires admin privileges)
npm run setup:global

# Now you can run the prompt composer from anywhere
prompt-composer
```

### Usage

Run the prompt composer:

```bash
prompt-composer
```

Follow the interactive menu to:

1. Generate a new prompt
2. View your prompt history
3. Exit the application

## Syntax

### Include Files

You can include content from other files using the include directive:

```markdown
<!-- @include path/to/file.md -->
```

### Reference Templates

When generating prompts, you can use references that will be interactively resolved:

```markdown
Here's a template that uses {{reference.path}} syntax.
```

## Development

```bash
# Run in development mode (without building)
npm run dev
```

## Markdown Include System

This repository also supports a custom Markdown preprocessor that allows you to include content from other Markdown files using the `<!-- @include path/to/file.md -->` syntax. For more information, see [MARKDOWN_INCLUDES.md](MARKDOWN_INCLUDES.md).