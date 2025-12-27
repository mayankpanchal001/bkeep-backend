import js from "@eslint/js";
import pluginEslintComments from "eslint-plugin-eslint-comments";
import pluginImport from "eslint-plugin-import";
import pluginJest from "eslint-plugin-jest";
import pluginNode from "eslint-plugin-node";
import eslintPrettierRecommended from 'eslint-plugin-prettier/recommended';
import pluginSecurity from "eslint-plugin-security";
import pluginUnicorn from "eslint-plugin-unicorn";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  { ignores: ["**/*.config.*", "coverage/**", "dist", "node_modules"] },
  
  /* TypeScript configuration */
  {
    files: ["src/**/*.{js,mjs,cjs,ts,mts,cts}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        project: './tsconfig.json',
        parser: "@typescript-eslint/parser"
      },
      globals: globals.node
    },
    plugins: {
      js,
      import: pluginImport,
      node: pluginNode,
      unicorn: pluginUnicorn,
      security: pluginSecurity as any,
      "eslint-comments": pluginEslintComments,
    },
    extends: ["js/recommended", "security/recommended"],
    rules: {
      /* Code Quality */
      "prettier/prettier": "error",
      "no-debugger": "error",
      "no-console": "error",

      /* TypeScript Specific Rules */
      "@typescript-eslint/no-unused-vars": ["error", { 
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_"
      }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-var-requires": "error",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/prefer-nullish-coalescing": "error",
      "@typescript-eslint/prefer-optional-chain": "error",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-misused-promises": "error",

      /* Unicorn */
      "unicorn/filename-case": [
        "error",
        {
          "cases": {
            "camelCase": true,
            "pascalCase": true
          },
          "ignore": [
            ".*_table.*\\.(ts|js)$",
            "[0-9]+_.*\\.(ts|js)$"
          ]
        }
      ],
      "unicorn/better-regex": "error",
      "unicorn/no-array-reduce": "error",
      "unicorn/prefer-optional-catch-binding": "error",
      "unicorn/prefer-string-replace-all": "error",

      /* Import */
      "import/no-extraneous-dependencies": "off",
      "import/no-duplicates": "error",
      "import/no-unresolved": "off",
      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
          pathGroups: [
            {
              pattern: "@*/**",
              group: "internal",
              position: "after"
            }
          ],
          pathGroupsExcludedImportTypes: ["builtin"],
          "newlines-between": "always",
          alphabetize: {
            order: "asc",
            caseInsensitive: true
          }
        }
      ],

      /* Node.js */
      "node/no-process-exit": "error",
      "node/no-callback-literal": "error",
      "node/no-new-require": "error",

      /* Security */
      "security/detect-object-injection": "error",
      "security/detect-non-literal-fs-filename": "error",
      "security/detect-unsafe-regex": "error"
    }
  },
  
  eslintPrettierRecommended,
  ...(tseslint.configs.recommended as any),

  /* Jest (Only for Test Files) */
  {
    files: ['**/*.{test,spec}.{js,ts}', '**/__tests__/**/*.{js,ts}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.jest, ...globals.node },
      parserOptions: {
        project: './tsconfig.json',
        parser: '@typescript-eslint/parser',
      },
    },
    plugins: {
      js,
      jest: pluginJest,
      node: pluginNode,
    },
    extends: ['js/recommended', 'jest/recommended'],
    rules: {
      'jest/prefer-expect-assertions': 'off',
      'jest/no-disabled-tests': 'warn',
      'jest/no-focused-tests': 'error',
      'jest/no-identical-title': 'error',
      'jest/no-mocks-import': 'error',
      'jest/expect-expect': 'error',
      'jest/no-conditional-expect': 'error',
      'jest/valid-expect': 'error',
      'jest/valid-expect-in-promise': 'error',

      // Relax some rules for tests
      '@typescript-eslint/no-explicit-any': 'off',
      'jest/no-jest-import': 'off',
      'no-console': 'off',
    },
  },
]);
