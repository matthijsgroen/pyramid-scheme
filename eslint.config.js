// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook"

import js from "@eslint/js"
import globals from "globals"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import tseslint from "typescript-eslint"
import { globalIgnores } from "eslint/config"
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended"
import tailwind from "eslint-plugin-tailwindcss"
import { join } from "node:path"

export default tseslint.config(
  [
    globalIgnores(["dist", "storybook-static", ".yarn", "node_modules", ".claude"]),
    {
      files: ["**/*.{ts,tsx}"],
      extends: [
        js.configs.recommended,
        tseslint.configs.recommended,
        reactHooks.configs.flat["recommended-latest"],
        reactRefresh.configs.vite,
      ],
      languageOptions: {
        ecmaVersion: 2020,
        globals: globals.browser,
      },
      rules: {
        // React Compiler rules new in eslint-plugin-react-hooks 7. They flag 20
        // real spots; warn until those are worked through, then drop this block.
        // ponytail: warn-level backlog, flip back to error once it is empty
        "react-hooks/preserve-manual-memoization": "warn",
        "react-hooks/set-state-in-effect": "warn",
        "react-hooks/refs": "warn",
        "react-hooks/use-memo": "warn",
        "@typescript-eslint/no-unused-vars": [
          "error",
          {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
            caughtErrorsIgnorePattern: "^_",
          },
        ],
      },
    },
    {
      files: ["**/*.{ts,tsx}"],
      extends: [tailwind.configs.recommended],
      settings: {
        tailwindcss: {
          cssConfigPath: join(process.cwd(), "src", "index.css"),
        },
      },
    },
    eslintPluginPrettierRecommended,
  ],
  storybook.configs["flat/recommended"]
)
