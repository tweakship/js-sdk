module.exports = {
    env: {
        es2021: true,
        node: true,
        jest: true,
    },
    extends: [
        'airbnb-base',
        'airbnb-typescript/base',
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:import/typescript',
        'plugin:prettier/recommended',
        'prettier',
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
        tsconfigRootDir: __dirname,
        project: ['./tsconfig.json'],
    },
    plugins: ['@typescript-eslint', 'import', 'prettier'],
    rules: {
        '@typescript-eslint/no-empty-interface': 'off',
        'prettier/prettier': 'error',
        '@typescript-eslint/no-shadow': 'error',
        '@typescript-eslint/no-unused-vars': ['error', { args: 'all', argsIgnorePattern: '^_' }],
        'class-methods-use-this': 'off',
        'no-console': 'error',
        'no-continue': 'off',
        'import/prefer-default-export': 'off',
        'no-underscore-dangle': ['error', { allowAfterThis: true }],
        curly: ['error', 'all'],
        'no-confusing-arrow': 'off',
        'no-restricted-syntax': ['error', 'SequenceExpression'],
        'import/no-extraneous-dependencies': 'off'
    },
};
