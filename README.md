# Figma to Email Training Data Generator

This project generates training data for AI models by analyzing Figma designs and matching them with HTML email templates.

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

## Usage

1. Update the Figma file ID in `src/index.js`
2. Run `npm start`

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