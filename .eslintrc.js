module.exports = {
  env: {
    browser: false,
    es2021: true,
    mocha: true,
    node: true,
  },
  plugins: [
    "@typescript-eslint",
    "node",
  ],
  extends: [
    // "standard",
    // "plugin:prettier/recommended",
    // "plugin:node/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 12,
    project: './tsconfig.json',
  },
  rules: {
    "node/no-unsupported-features/es-syntax": ["error", { ignores: ["modules"] }],
    'guard-for-in': 'warn',
    // 'eqeqeq': ['warn', 'always', { null: 'ignore' }],
    '@typescript-eslint/await-thenable': 'warn',
    '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: true }],
    'no-fallthrough': 'error',
  },
};
