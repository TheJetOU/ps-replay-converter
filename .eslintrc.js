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
            },
        },
        {
            files: ["**/**.js"],
            parserOptions: {
                ecmaVersion: 2020,
                sourceType: "module",
            },
            extends: ["eslint:recommended", "plugin:prettier/recommended"],
            rules: {},
        },
    ],
};
