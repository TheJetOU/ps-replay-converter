module.exports = {
    overrides: [
        {
            files: ["**/**.ts"],
            parser: "@typescript-eslint/parser",
            parserOptions: {
                ecmaVersion: 2020,
                sourceType: "module",
            },
            extends: [
                "plugin:@typescript-eslint/recommended",
                "prettier/@typescript-eslint",
                "plugin:prettier/recommended",
            ],
            rules: {
                "@typescript-eslint/explicit-module-boundary-types": "off",
                "@typescript-eslint/no-non-null-assertion": "off",
                "@typescript-eslint/no-explicit-any": "off",
            },
        },
        {
            files: ["**/**.js"],
            env: {
                node: true,
            },
            parserOptions: {
                ecmaVersion: 2020,
                sourceType: "script",
            },
            extends: ["eslint:recommended", "plugin:prettier/recommended"],
            rules: {},
        },
    ],
};
