"use strict";

const globals = {
  __dirname: "readonly",
  Buffer: "readonly",
  clearTimeout: "readonly",
  console: "readonly",
  module: "writable",
  process: "readonly",
  require: "readonly",
  setTimeout: "readonly",
};

module.exports = [
  {
    files: ["**/*.js"],
    ignores: ["node_modules/**"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        ...globals,
        afterAll: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        beforeEach: "readonly",
        describe: "readonly",
        expect: "readonly",
        it: "readonly",
        jest: "readonly",
        test: "readonly",
      },
    },
    rules: {
      "no-constant-condition": "error",
      "no-dupe-keys": "error",
      "no-duplicate-imports": "error",
      "no-unreachable": "error",
      "no-undef": "error",
      "no-unexpected-multiline": "error",
      "valid-typeof": "error",
    },
  },
];
