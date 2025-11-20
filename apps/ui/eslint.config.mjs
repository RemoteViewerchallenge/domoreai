// eslint.config.mjs
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  // 1. GLOBAL IGNORES
  // Must be the first object with only an 'ignores' key
  {
    ignores: [
      '**/dist',
      '**/node_modules',
      '**/coverage',
      '**/.next',
      '**/*.d.ts', // Explicitly ignore declaration files
      '**/src/**/*.js', // Ignore transpiled .js files in src directories
      'tailwind.config.js', // Ignore tailwind config file from TS parsing
    ],
  },

  // 2. JAVASCRIPT & CONFIG FILES (No Type Checking)
  // Solves "Parsing error" and "CommonJS globals"
  {
    files: [
      '**/*.cjs',
      '**/*.mjs',
      '**/*.config.js',
      'eslint.config.mjs', // This file itself
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module', // Default to module for .mjs, .config.js
      globals: {
        ...globals.node, // Adds require, module, __dirname, process
      },
      parserOptions: {
        project: null, // CRITICAL: Disables TS parser for JS files
      },
    },
    rules: {
      '@typescript-eslint/no-var-requires': 'off', // Allow require() in JS files
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.cjs'], // Specific override for .cjs files
    languageOptions: {
      sourceType: 'commonjs',
    },
  },

  // 3. TYPESCRIPT FILES (Strict Type Checking)
  {
    files: ['**/*.ts', '**/*.tsx'],
    // Use the new tseslint utility to combine configs
    extends: [
      ...tseslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.app.json', './tsconfig.node.json'], // Adjust to your monorepo structure
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Downgrade specific rules to warnings as requested
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/ban-ts-comment': 'warn', // Allow @ts-ignore with a warning

      // Temporarily downgrade no-unsafe-* rules to warnings
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'warn',
      '@typescript-eslint/require-await': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
    },
  },

  // 4. REACT FILES (Manual Plugin Config)
  {
    files: ['**/*.jsx', '**/*.tsx'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser, // Adds window, document, etc.
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // Disable rules for new JSX transform (React 17+)
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
    },
  }
);
