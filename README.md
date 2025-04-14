# Figma to Email Converter

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

This project aims to create an AI-powered system that automatically converts Figma designs into production-ready HTML emails. It uses machine learning to understand design patterns and generate semantically correct HTML that matches the original design intent.

## Project Goals
1. **Design Analysis**: Extract components and patterns from Figma designs
2. **HTML Generation**: Convert design components into semantic HTML
3. **Training Data**: Generate high-quality training data for the AI model
4. **Email Templates**: Produce production-ready email templates that work across clients

## Current Phase
We are currently in the training data generation phase, where we:
- Analyze existing Figma designs and their corresponding HTML emails
- Match components between designs and HTML
- Generate training examples for the AI model
- Document patterns and best practices

## Prerequisites

- Node.js >= 14.0.0
- npm >= 6.0.0
- Figma API access token
- Iterable API access token

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/hdesaboia/Figma-email-coding.git
   cd Figma-email-coding
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and add your:
   - FIGMA_ACCESS_TOKEN
   - ITERABLE_API_KEY

4. Run tests to verify setup:
   ```bash
   npm test
   ```

## Usage

### Basic Usage
1. Update the Figma file ID in `src/index.js`
2. Run the analysis:
   ```bash
   npm start
   ```

### Example Output
```bash
$ npm start
📊 Analyzing Figma components...
✅ Found 100 components (84 text, 16 buttons)
📧 Matching with HTML templates...
✅ Match rate: 100%
💾 Saving training data...
✅ Training data saved to training_data/
```

### Configuration
You can configure the analysis by modifying:
- `src/config.js`: General settings
- `src/ai/iterableAnalyzer.js`: HTML parsing rules
- `src/ai/designComponentMapper.js`: Component matching rules

## Contributing

We welcome contributions! Here's how to help:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

### Code Style
- Use 2 spaces for indentation
- Follow JavaScript Standard Style
- Write tests for new features
- Document complex logic

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Version Control Guidelines

### Branch Strategy
- `main`: Stable, production-ready code
- `feature/*`: New features or improvements
- `experiment/*`: Experimental changes
- `fix/*`: Bug fixes

### Commit Guidelines
1. Make atomic commits (one logical change per commit)
2. Write clear commit messages:
   ```
   type(scope): description
   
   [optional body]
   ```
   Types:
   - feat: New feature
   - fix: Bug fix
   - docs: Documentation changes
   - style: Code style changes
   - refactor: Code refactoring
   - test: Test-related changes
   - chore: Maintenance tasks

### Workflow
1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make changes and commit:
   ```bash
   git add .
   git commit -m "feat(component): add Figma component extraction"
   ```

3. Push to GitHub:
   ```bash
   git push origin feature/your-feature-name
   ```

4. Create a Pull Request on GitHub

5. After review, merge to main:
   ```bash
   git checkout main
   git merge feature/your-feature-name
   ```

### Reverting Changes
If something breaks:
1. Go back to last working version:
   ```bash
   git checkout main
   ```

2. Undo last commit if needed:
   ```bash
   git reset --hard HEAD~1
   ```

3. Force push (if already pushed):
   ```bash
   git push origin main --force
   ```

## Project Structure
```
src/
  ├── ai/           # AI-related code
  ├── email/        # Email template handling
  ├── figma/        # Figma API integration
  ├── iterable/     # Iterable API integration
  └── test/         # Test files
```

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

3. Run tests:
   ```bash
   npm test
   ```

## Making Changes

### Basic Workflow
1. Make your changes to the code
2. Stage the changes:
   ```bash
   git add .  # Stage all changes
   # or
   git add filename  # Stage specific file
   ```

3. Commit the changes:
   ```bash
   git commit -m "type(scope): description of changes"
   ```

4. Push to GitHub:
   ```bash
   git push
   ```

> **Important**: You must complete all three steps (add, commit, push) for your changes to appear on GitHub. If you skip any step, your changes won't be tracked in the repository history.

### When to Push Changes
As a general rule, push your changes when:
- You've completed a logical piece of work
- You're about to make big changes
- You're ending your work session
- You've fixed a bug

Avoid pushing:
- Code that doesn't work at all
- Sensitive information (passwords, API keys)
- Very large files

When in doubt, it's better to push than not to push - you can always undo changes if needed.

### Example
Let's say you modified the component extraction logic:
```bash
# After making changes
git add src/ai/iterableAnalyzer.js
git commit -m "feat(component): improve HTML component extraction"
git push
```