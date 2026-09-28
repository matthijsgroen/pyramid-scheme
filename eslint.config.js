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

const MODS = ["puzzle", "mosaic", "hieroglyph", "trap", "shop", "tombTreasure", "topology"]

const DOMAIN = "src/{game,data,worldGen}/**/*.{ts,tsx}"

const NO_MOD_NAMES = {
  group: ["@/mods/*/**", "!@/mods/core/**"],
  message:
    "Core must not name a mod (docs/mods/TARGET.md). Move the fact into the owning mod and read it back through a registry.",
}

const DOMAIN_IS_PORTABLE = {
  group: [
    "@/app",
    "@/app/**",
    "@/ui",
    "@/ui/**",
    // Any path with an `app` or `ui` segment, so a relative hop out of the domain is caught too.
    "**/app/**",
    "**/ui/**",
    "react",
    "react/**",
    "react-dom",
    "react-dom/**",
    "react-i18next",
    "i18next",
  ],
  message:
    "The domain layer is pure TypeScript and has to keep running in the world-generation CLI, so it names no React, no app/ and no ui/ (docs/instructions/architecture.md). Move what it needs down into src/game, src/data or src/worldGen — src/game/mark.ts is the precedent.",
}

const namesNoOtherMod = mod => ({
  group: ["@/mods/*/**", "!@/mods/core/**", `!@/mods/${mod}/**`],
  message:
    "A mod must not name another mod (docs/mods/TARGET.md). Go through a registry seam, or move the fact to whichever mod owns it.",
})

// What the one app-reaching domain spec still may not name. The app patterns are dropped rather than
// negated, because a `!` entry in a group does not subtract from the patterns beside it.
const REACT_AND_UI_STAY_OUT = {
  group: DOMAIN_IS_PORTABLE.group.filter(pattern => !pattern.includes("app")),
  message:
    "Reaching the app registry is this spec's one exemption. React and ui/ are not: the domain layer has to keep running in the world-generation CLI (docs/instructions/architecture.md).",
}

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
      // Core names no mod (docs/mods/TARGET.md). At zero, so it is an error: a new one fails the build.
      files: ["src/app/**/*.{ts,tsx}", "src/ui/**/*.{ts,tsx}", DOMAIN],
      rules: {
        "@typescript-eslint/no-restricted-imports": ["error", { patterns: [NO_MOD_NAMES] }],
      },
    },
    {
      // The domain layer stays portable (docs/instructions/architecture.md, AGENTS.md §8). A later block
      // REPLACES the rule's options rather than adding to them, so the mod patterns are restated here.
      // Specs are covered too: a domain spec reaching into the app is how React got into a node CLI
      // once already, and it is the same mistake whether or not the file ships.
      files: [DOMAIN],
      rules: {
        "@typescript-eslint/no-restricted-imports": ["error", { patterns: [NO_MOD_NAMES, DOMAIN_IS_PORTABLE] }],
      },
    },
    {
      // THE ONE DOMAIN FILE THAT REACHES THE APP ON PURPOSE: this spec proves the assembler refuses a
      // switch family whose room cannot be re-entered, and only the real registry has a family that
      // genuinely lacks `reEnterable` — the fallback resolver claims it for none.
      files: ["src/game/siteAssembler.spec.ts"],
      rules: {
        "@typescript-eslint/no-restricted-imports": ["error", { patterns: [NO_MOD_NAMES, REACT_AND_UI_STAY_OUT] }],
      },
    },
    // A mod names no other mod (docs/mods/TARGET.md); core is the engine, not a sibling.
    ...MODS.map(mod => ({
      files: [`src/mods/${mod}/**/*.{ts,tsx}`],
      rules: {
        "@typescript-eslint/no-restricted-imports": [
          "error",
          {
            patterns: [namesNoOtherMod(mod)],
          },
        ],
      },
    })),
    // A MOD'S OWN game/ IS DOMAIN. It runs in the world-generation CLI exactly as src/game does, so it
    // keeps React, app/ and ui/ out. The block above matches these files too and would otherwise be the
    // last word on them, so both patterns are restated rather than added to.
    ...MODS.map(mod => ({
      files: [`src/mods/${mod}/game/**/*.{ts,tsx}`],
      rules: {
        "@typescript-eslint/no-restricted-imports": ["error", { patterns: [namesNoOtherMod(mod), DOMAIN_IS_PORTABLE] }],
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
