const tseslint = require("@typescript-eslint/eslint-plugin");
const tsparser = require("@typescript-eslint/parser");

module.exports = [
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsparser,
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      "@typescript-eslint/ban-ts-comment": "warn",
    },
  },
  {
    // Relax unused-vars in test files - mock setup variables are intentionally declared
    files: ["src/**/__tests__/**/*.ts", "src/**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
  {
    ignores: ["dist/**", "node_modules/**"],
  },
];
