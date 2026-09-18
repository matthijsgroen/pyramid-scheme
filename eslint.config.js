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

// Every mod folder under src/mods/, for the sibling-import rule below. `core` is not in the list: it
// is the engine, and the rule exempts it as an import target rather than restricting it as a source.
const MODS = ["puzzle", "mosaic", "hieroglyph", "trap", "shop", "tombTreasure"]

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
      // **Core names no mod** (docs/mods/TARGET.md): core owns mechanisms, a mod owns meaning, so a
      // core file reaching into `@/mods/<name>/` is core knowing a mechanic it must be able to build
      // without. The seams that stay open are the aggregates a mod registers itself through —
      // `registeredMods`, `allFamilyMeta`, `registerModApps` — and `@/mods/core/`, which is the
      // engine rather than a mod.
      //
      // ponytail: warn-level backlog. Every hit is a real one, and each is inverted by moving the
      // fact into the owning mod and reading it back through a registry, not by widening this rule.
      // `yarn lint`'s --max-warnings pins the count so the backlog can only shrink.
      files: ["src/app/**/*.{ts,tsx}", "src/ui/**/*.{ts,tsx}", "src/{game,data,worldGen}/**/*.{ts,tsx}"],
      rules: {
        "@typescript-eslint/no-restricted-imports": [
          "warn",
          {
            patterns: [
              {
                group: ["@/mods/*/**", "!@/mods/core/**"],
                message:
                  "Core must not name a mod (docs/mods/TARGET.md). Move the fact into the owning mod and read it back through a registry.",
              },
            ],
          },
        ],
      },
    },
    // **A mod names no other mod.** A mod is one standalone mechanic (docs/mods/TARGET.md), so reaching
    // into a sibling's internals makes the two removable only together. `core` is exempt as the target:
    // it is the engine every mod is built on, not a mod.
    //
    // ponytail: warn-level backlog, same pin as above.
    ...MODS.map(mod => ({
      files: [`src/mods/${mod}/**/*.{ts,tsx}`],
      rules: {
        "@typescript-eslint/no-restricted-imports": [
          "warn",
          {
            patterns: [
              {
                group: ["@/mods/*/**", "!@/mods/core/**", `!@/mods/${mod}/**`],
                message:
                  "A mod must not name another mod (docs/mods/TARGET.md). Go through a registry seam, or move the fact to whichever mod owns it.",
              },
            ],
          },
        ],
      },
    })),
    {
      files: ["**/*.{ts,tsx}"],
      extends: [tailwind.configs.recommended],
      settings: {
        tailwindcss: {
          cssConfigPath: join(process.cwd(), "src", "index.css"),
        },
      },
      rules: {
        // The rule cannot see through a variable: interpolate one into a class string and it reports
        // the VARIABLE NAME as an unknown class. Every hit it produced here was that — a className
        // passthrough, or a local holding class strings (transitionDuration, buttonCls, tone) — so
        // its real catch, a typo in a literal class, was buried under 23 false positives.
        "tailwindcss/no-custom-classname": "off",
      },
    },
    eslintPluginPrettierRecommended,
  ],
  storybook.configs["flat/recommended"]
)
