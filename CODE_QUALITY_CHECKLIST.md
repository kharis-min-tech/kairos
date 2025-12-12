# Code Quality Setup Checklist

Use this checklist to verify that all code quality tools are properly configured and working.

## ✅ Configuration Files

- [x] `.eslintrc.json` - ESLint configuration with TypeScript and React rules
- [x] `.prettierrc` - Prettier formatting configuration
- [x] `.prettierignore` - Prettier ignore patterns
- [x] `.gitignore` - Git ignore patterns (enhanced)
- [x] `.editorconfig` - Editor configuration
- [x] `.lintstagedrc.json` - Lint-staged configuration
- [x] `.husky/pre-commit` - Pre-commit Git hook
- [x] `.husky/_/husky.sh` - Husky shell script

## 📦 Dependencies

Check that these are in `package.json`:

- [x] `eslint` (~8.56.0)
- [x] `prettier` (^3.2.4)
- [x] `husky` (^8.0.3)
- [x] `lint-staged` (^15.2.0) - **Needs installation**
- [x] `@typescript-eslint/eslint-plugin` (^6.19.0)
- [x] `@typescript-eslint/parser` (^6.19.0)
- [x] `eslint-config-prettier` (^9.1.0)
- [x] `eslint-plugin-react` (7.33.2)
- [x] `eslint-plugin-react-hooks` (4.6.0)
- [x] `eslint-plugin-jsx-a11y` (6.8.0)

## 🔧 Setup Steps (Required)

### Step 1: Enable PowerShell Scripts (Windows)
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Step 2: Install Dependencies
```bash
npm install
```

This will:
- Install lint-staged
- Run Husky prepare script
- Set up Git hooks

### Step 3: Verify Installation
```bash
# Check versions
npx eslint --version
npx prettier --version
npx husky --version
npx lint-staged --version
```

## ✅ Verification Tests

### Test 1: ESLint
```bash
npm run lint
```
**Expected**: Should run without errors (or show existing issues to fix)

### Test 2: Prettier Format Check
```bash
npm run format:check
```
**Expected**: Should check formatting across all files

### Test 3: Prettier Format
```bash
npm run format
```
**Expected**: Should format all files

### Test 4: ESLint Auto-fix
```bash
npm run lint:fix
```
**Expected**: Should fix auto-fixable issues

### Test 5: Git Pre-commit Hook
```bash
# Create a test file with formatting issues
echo "const x=1;const y=2" > test-file.ts

# Stage the file
git add test-file.ts

# Try to commit
git commit -m "test: verify pre-commit hooks"
```
**Expected**: 
- Lint-staged should run
- ESLint should check the file
- Prettier should format the file
- File should be auto-fixed and formatted
- Commit should succeed (or fail if there are unfixable errors)

### Test 6: Module Boundary Enforcement
Create a test file that violates module boundaries and run:
```bash
npm run lint
```
**Expected**: Should show module boundary violation errors

## 🎯 Success Criteria

All of the following should be true:

- [ ] All configuration files exist
- [ ] `npm install` completes successfully
- [ ] `npm run lint` executes without errors
- [ ] `npm run format` formats files correctly
- [ ] Git pre-commit hook runs automatically on commit
- [ ] Lint-staged processes only staged files
- [ ] ESLint catches TypeScript and React issues
- [ ] Prettier formats code consistently
- [ ] Module boundaries are enforced

## 🐛 Troubleshooting

### Issue: "Scripts are disabled on this system"
**Solution**: Run PowerShell as Administrator and execute:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Issue: Husky hooks not running
**Solution**: 
```bash
npm run prepare
# On Unix/Mac, make hooks executable:
chmod +x .husky/pre-commit
```

### Issue: ESLint errors on commit
**Solution**: 
```bash
npm run lint:fix
git add .
git commit -m "your message"
```

### Issue: Prettier conflicts with ESLint
**Solution**: Already configured! `eslint-config-prettier` is included to disable conflicting rules.

## 📚 Documentation

- See `README.md` for code quality tool usage
- See `SETUP.md` for detailed setup instructions
- See `.kiro/specs/monorepo-scaffold/task-2-summary.md` for implementation details

## 🎉 Next Steps

Once all checks pass:

1. Clean up test files created during verification
2. Run `npm run format` to format all existing code
3. Run `npm run lint:fix` to fix any auto-fixable issues
4. Commit the changes
5. Proceed to Task 3 in the implementation plan

---

**Status**: Configuration complete, awaiting user to run `npm install` and verify setup.
