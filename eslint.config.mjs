import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  {
    ignores: [
      "dist/**",
      "node_modules/**",
    ],
  },

  {
    files: ["src/**/*.ts", "test/**/*.ts"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
    ],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
        },
      ],
    },
  },

  {
    files: ["test/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },

  {
    files: ["public/**/*.js"],
    extends: [
      js.configs.recommended,
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
]);
