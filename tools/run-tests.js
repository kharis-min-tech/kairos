#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

// Change to workspace root
const workspaceRoot = path.resolve(__dirname, '..');
process.chdir(workspaceRoot);

console.log('Running scaffold validation tests...');
console.log('Workspace root:', workspaceRoot);

try {
  // Run scaffold validation tests
  console.log('\n=== Running Scaffold Validation Tests ===');
  execSync('npx nx test tools', { stdio: 'inherit' });

  console.log('\n=== Running Unit Tests ===');
  execSync('npx nx run-many --target=test --all', { stdio: 'inherit' });

  console.log('\n=== Running E2E Tests ===');
  execSync('npx nx run-many --target=e2e --all', { stdio: 'inherit' });

  console.log('\n✅ All tests passed!');
} catch (error) {
  console.error('\n❌ Tests failed:', error.message);
  process.exit(1);
}
