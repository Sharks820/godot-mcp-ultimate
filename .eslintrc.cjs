module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    // Type safety
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],

    // Code quality
    'no-console': ['warn', { allow: ['error', 'warn'] }],
    'prefer-const': 'error',
    'no-var': 'error',

    // Style (let TypeScript handle most of this)
    'semi': ['error', 'always'],
    'quotes': ['error', 'double', { avoidEscape: true }],

    // Allow empty catch blocks (common pattern)
    'no-empty': ['error', { allowEmptyCatch: true }],

    // Godot MCP specific - allow type assertions for tool args
    '@typescript-eslint/no-non-null-assertion': 'off',
  },
  ignorePatterns: [
    'dist/',
    'node_modules/',
    '*.js',
    '*.cjs',
  ],
};
