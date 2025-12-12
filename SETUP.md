# Kairos Setup Guide

## Code Quality Tools Setup

This project has been configured with comprehensive code quality tools. Follow these steps to complete the setup:

### 1. PowerShell Execution Policy (Windows Only)

If you're on Windows and encounter PowerShell execution policy errors, you need to enable script execution:

**Option A: For Current User (Recommended)**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Option B: For Current Process Only (Temporary)**
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
```

### 2. Install Dependencies

After setting the execution policy, install all dependencies including lint-staged:

```bash
npm install
```

This will:
- Install all project dependencies
- Install lint-staged for pre-commit hooks
- Run the Husky prepare script to set up Git hooks

### 3. Verify Installation

Check that everything is installed correctly:

```bash
# Check ESLint
npx eslint --version

# Check Prettier
npx prettier --version

# Check Husky
npx husky --version

# Check lint-staged
npx lint-staged --version
```

### 4. Test Code Quality Tools

**Test ESLint:**
```bash
npm run lint
```

**Test Prettier:**
```bash
npm run format:check
```

**Test Git Hooks:**
```bash
# Make a small change to a file
# Stage the file
git add .

# Try to commit (hooks will run automatically)
git commit -m "test: verify pre-commit hooks"
```

## Configuration Files

The following configuration files have been set up:

### ESLint (`.eslintrc.json`)
- TypeScript rules with strict type checking
- React and React Hooks rules
- JSX accessibility (a11y) rules
- NX module boundary enforcement
- Prettier integration

### Prettier (`.prettierrc`)
- Single quotes
- 2-space indentation
- 80 character line width
- Semicolons required
- Trailing commas (ES5)
- LF line endings

### Husky (`.husky/`)
- Pre-commit hook configured
- Runs lint-staged on commit

### Lint-Staged (`.lintstagedrc.json`)
- Auto-fixes ESLint issues on staged files
- Formats code with Prettier on staged files
- Processes TypeScript, JavaScript, JSON, Markdown, and YAML files

### EditorConfig (`.editorconfig`)
- UTF-8 charset
- 2-space indentation
- LF line endings
- Trim trailing whitespace

### Git Ignore (`.gitignore`)
- Excludes node_modules, dist, build outputs
- Excludes .env files and environment variables
- Excludes IDE and OS-specific files
- Excludes test coverage and logs

## Troubleshooting

### Husky hooks not running

If Git hooks aren't running:

```bash
# Reinstall Husky hooks
npm run prepare

# Make hooks executable (Unix/Mac)
chmod +x .husky/pre-commit
```

### ESLint errors on commit

If you get ESLint errors during commit:

```bash
# Fix automatically
npm run lint:fix

# Or fix manually and commit again
```

### Prettier formatting issues

If Prettier formatting fails:

```bash
# Format all files
npm run format

# Then stage and commit
git add .
git commit -m "your message"
```

## Next Steps

After completing the setup:

1. Run `npm run lint` to check for any existing linting issues
2. Run `npm run format` to format all existing code
3. Make a test commit to verify Git hooks are working
4. Continue with the next task in the implementation plan

## Additional Resources

- [ESLint Documentation](https://eslint.org/docs/latest/)
- [Prettier Documentation](https://prettier.io/docs/en/)
- [Husky Documentation](https://typicode.github.io/husky/)
- [NX Documentation](https://nx.dev/)
