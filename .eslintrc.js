module.exports = {
    "env": {
        "browser": true,
        "es2021": true,
        "node": true
    },
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
        "plugin:prettier/recommended",
        "prettier",
        "plugin:import/errors",
        "plugin:import/warnings",
        "plugin:import/typescript"
    ],
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaVersion": 12,
        "project": "tsconfig.json",
        "sourceType": "module"
    },
    "plugins": [
        "@typescript-eslint",
        "import"
    ],
    "rules": { // TODO: Remover as exceções com 1, isto é, warning.
        "@typescript-eslint/no-misused-promises": 1,
        "no-async-promise-executor": 1
    },
};
