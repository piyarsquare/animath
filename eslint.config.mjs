// Lint-only setup (no formatter — a repo-wide reformat would conflict with the
// parallel-branch workflow; see AGENTS.md → Contribution Checks).
// Scope: src/ TypeScript only. Keep the rule set high-signal: real bugs, not style.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', 'src/unported_examples/', 'docs/', 'scripts/', 'sh-test/'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // Only the two classic hooks rules. The plugin's v7 "recommended" set
      // adds the React Compiler rules (refs/immutability/purity/…), which
      // reject the deliberate ref-mutation patterns the Three.js engine is
      // built on — revisit if the codebase ever adopts the compiler.
      'react-hooks/rules-of-hooks': 'error',
      // The engines pass uniform/state bags around; `any` appears at the
      // Three.js/shader boundary. Surface it as a warning, not a blocker.
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      // Allow intentionally-unused names when underscore-prefixed.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  }
);
