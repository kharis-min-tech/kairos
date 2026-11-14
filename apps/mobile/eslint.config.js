const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = [
  ...expoConfig,
  {
    ignores: ['node_modules/**', '.expo/**', 'dist/**', 'coverage/**'],
  },
  {
    rules: {
      'import/no-unresolved': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['*.config.js', 'jest.setup.ts'],
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    languageOptions: {
      globals: { ...globals.jest },
    },
  },
];
