import tsParser from "@typescript-eslint/parser";

export default [
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
    },
    rules: {
      "max-lines": ["error", { max: 200, skipBlankLines: false, skipComments: false }],
    },
  },
  {
    files: ["**/*.test.ts"],
    rules: {
      "max-lines": ["error", { max: 500, skipBlankLines: false, skipComments: false }],
    },
  },
];
