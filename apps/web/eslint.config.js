const tseslint = require("@typescript-eslint/eslint-plugin");
const tsparser = require("@typescript-eslint/parser");

let nextPlugin = null;

try {
  nextPlugin = require("@next/eslint-plugin-next");
} catch {
  nextPlugin = null;
}

module.exports = [
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsparser,
    },
    plugins: {
      "@typescript-eslint": tseslint,
      ...(nextPlugin ? { "@next/next": nextPlugin } : {}),
    },
    rules: {
      ...(nextPlugin ? nextPlugin.configs.recommended.rules : {}),
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
    },
  },
  {
    ignores: [".next/**", "node_modules/**"],
  },
];
