# 🏺 Pyramid Scheme — Agent Guide

This document describes how AI coding agents should understand and work within this project. It supplements `.github/copilot-instructions.md` with deeper context on architecture, conventions, and workflows.

---

## Project Overview

**Pyramid Scheme** is an ancient Egyptian-themed mathematical puzzle game built with:

- **React 19 + TypeScript** — Full type safety throughout
- **Vite** — Fast dev server and build tooling
- **Tailwind CSS v4** — Utility-first styling (class order enforced by linter)
- **i18next** — Internationalization (English + Dutch)
- **Vitest + Testing Library** — Unit and component testing
- **Storybook** — UI component documentation and visual testing

---

## Architecture Overview

```
src/
├── app/          # App shell, pages, routing, state management, expedition logic
├── data/         # Game data definitions and translation hooks
├── game/         # Pure game logic: puzzle generation, rewards, randomization
├── ui/           # Reusable themed UI components + Storybook stories
│   ├── principles/   # Design-token/foundation docs (colors, spacing, typography)
│   ├── atoms/        # Leaf components — render no other src/ui component
│   ├── molecules/    # Compose a few atoms
│   └── organisms/    # Compose molecules/atoms into a complete UI section
├── components/   # Shared React components
├── contexts/     # React context providers
├── config/       # App-level configuration
├── i18n/         # i18next setup and configuration
└── support/      # Shared utilities and helpers

public/
└── locales/
    ├── en/       # English translations (common.json, tableaus.json, ...)
    └── nl/       # Dutch translations (must stay in sync with en/)
```

### Key Subsystems

| Subsystem            | Location                       | Responsibility                                                           |
| -------------------- | ------------------------------ | ------------------------------------------------------------------------ |
| Game Logic           | `src/game/`                    | Puzzle generation, seeded randomization, reward calculation              |
| Game Data            | `src/data/`                    | Journeys, tableaus, difficulty levels, hieroglyphs, inventory, treasures |
| App State            | `src/app/state/`               | Progress, inventory, logs — managed via custom hooks and context         |
| UI Components        | `src/ui/`                      | All themed (Egyptian-style) reusable components                          |
| Expedition Flow      | `src/app/`                     | `PyramidExpedition` and `TombExpedition` orchestrate full puzzle runs    |
| Internationalization | `src/i18n/`, `public/locales/` | All user-facing strings; always use `useTranslation`                     |

---

## Critical Conventions

### 1. Deterministic Randomization

All puzzle generation and reward logic **must** use the seeded random functions in `src/game/random.ts` (`mulberry32`, `generateNewSeed`). Never use `Math.random()` directly. This ensures the same seed always produces the same puzzle.

### 2. Game Data Separation

All journeys, tableaus, difficulty settings, and hieroglyphs are defined in `src/data/`. **Never hardcode game logic or data directly in UI or component files.**

### 3. State via Hooks

All game state (progress, inventory, journey logs) must be accessed and mutated through hooks in `src/app/state/`. Do not manage game state locally in components.

### 4. Tailwind Class Order

Tailwind CSS classes **must** follow canonical order as enforced by `eslint-plugin-tailwindcss`. Always run `yarn lint` to verify.

### 5. Internationalization

Every user-facing string must be localized. Use `useTranslation` from `react-i18next`. Update **both** `public/locales/en/` and `public/locales/nl/` in sync whenever adding or changing strings.

### 6. Storybook for UI

**Every** component in `src/ui/` must have a corresponding Storybook story, placed alongside it in the same atomic tier folder (`atoms/`, `molecules/`, `organisms/`). Stories must not contain shadow implementations of game logic — see **[`docs/instructions/storybook.md`](docs/instructions/storybook.md)** for the full guidelines, including how to classify a new component into a tier.

### 7. TypeScript Strictness

The project uses strict TypeScript. Avoid `any` types; define proper interfaces and types, preferably co-located with the code they describe.

### 8. Domain / App / Design-System Layer Boundaries

Code is split into three layers with strict one-way dependencies (domain ← app ← ui). See **[`docs/instructions/architecture.md`](docs/instructions/architecture.md)** for the full rules.

| Layer | Location | Rule |
|-------|----------|------|
| **Domain** | `src/game/`, `src/data/` | Pure TypeScript only — no React, no DOM, no i18n. Portable to CLI. |
| **App** | `src/app/` | State hooks, orchestration, flow. Composes from ui/. No HTML/CSS of its own. |
| **Design system** | `src/ui/` | Stateless components — props in, JSX out. No hooks except `useRef` for DOM ops. Strings passed as props, not from `useTranslation`. |

---

## Common Workflows

### Running the Project

```bash
yarn dev          # Dev server at http://localhost:9164
yarn test         # Run all tests (Vitest)
yarn test <file>  # Run a single test file
yarn check-types  # TypeScript type checking
yarn lint         # ESLint (includes Tailwind class order)
yarn build        # Production build
yarn storybook    # Component docs at http://localhost:6006
```

Always run `yarn check-types` and `yarn lint` before considering a change complete.

### Adding a New Journey or Tableau

1. Define the journey in `src/data/journeys.ts`
2. Define tableau(x) formulas in `src/data/tableaus.ts`
3. Add translation keys to `public/locales/en/tableaus.json` and `public/locales/nl/tableaus.json`
4. Titles must be short, narrative, and thematically Egyptian — reference the story/description, not just the symbols
5. Use the `run/level` key format (e.g., `run1_level1`)

### Adding a New UI Component

1. Classify it as an atom (renders no other `src/ui` component), molecule (composes a few atoms), or organism (composes molecules/atoms into a complete section)
2. Create the component in `src/ui/<tier>/`
3. Add a Storybook story alongside it in `src/ui/<tier>/<ComponentName>.stories.tsx`
4. Use Tailwind for styling (canonical class order)
5. Expose customization via props

### Adding a New Translation Key

1. Add the key and English value to the appropriate file under `public/locales/en/`
2. Add the Dutch equivalent to the corresponding file under `public/locales/nl/`
3. Consume with `useTranslation` in the component

---

## CI/CD Pipeline

| Workflow      | Trigger              | What it does                                                                                       |
| ------------- | --------------------- | --------------------------------------------------------------------------------------------------- |
| `test.yml`    | Push / Pull Request   | Type checks, lint, tests, build verification; posts version change notice on PRs                    |
| `release.yml` | Manual dispatch       | Bumps `package.json` and `CHANGELOG.md` from the Unreleased section, then deploys to GitHub Pages    |

Deploys only happen as part of a release — there is no separate deploy workflow.

---

## Testing Strategy

All behavior must have tests — tests ship in the same commit as the code.

See **[`docs/instructions/testing.md`](docs/instructions/testing.md)** for the full rules: what counts as behavior, layer-by-layer requirements, file placement, and test description style.

Quick reference:
- Spec files are **co-located** with source (e.g. `generateLevel.spec.ts` beside `generateLevel.ts`)
- Use **Vitest** + **`@testing-library/react`** (`render`/`renderHook`) — not just pure function extraction
- **Storybook** covers visual appearance; it does not substitute for behavior tests
- Test descriptions state the observable behavior and the invariant, not the implementation

Run all tests: `yarn test`

---

## Definition of Done

Before considering any task complete, run through this checklist:

| # | Check | Requirement |
|---|---|---|
| 1 | **Tests** | Every new behavior has a co-located spec. Run `yarn test` — all pass. See [`docs/instructions/testing.md`](docs/instructions/testing.md). |
| 2 | **Types** | `yarn check-types` exits clean. |
| 3 | **Lint** | `yarn lint` exits clean (includes Tailwind class order). |
| 4 | **Translations** | Any new user-facing string has both `en/` and `nl/` entries. |
| 5 | **Changelog** | Any player-visible change has an entry in `CHANGELOG.md [Unreleased]`. See [`docs/instructions/changelog.md`](docs/instructions/changelog.md). |

Steps 1–3 are always required. Steps 4–5 apply only when the change touches user-facing strings or player-visible behavior.

Version bumps are a deployment decision, not a per-feature step — see the CI/CD section above.

---

## Things to Avoid

- ❌ Using `Math.random()` — always use the seeded random utilities
- ❌ Hardcoding game data in components or pages
- ❌ Adding user-facing text without i18n keys
- ❌ Adding UI components without Storybook stories
- ❌ Skipping the Dutch translation when adding English strings
- ❌ Committing without running `yarn check-types` and `yarn lint`
- ❌ Managing game state locally in components (use state hooks instead)

---

## Agent Instructions

Topic-specific guidelines for contributors and AI agents. Apply the relevant instruction file whenever working in that area.

| Instruction file | Apply when |
|---|---|
| [`docs/instructions/storybook.md`](docs/instructions/storybook.md) | Writing or reviewing any `.stories.tsx` file |
| [`docs/instructions/architecture.md`](docs/instructions/architecture.md) | Adding, moving, or reviewing any source file — to determine which layer it belongs in |
| [`docs/instructions/documentation.md`](docs/instructions/documentation.md) | Creating or moving any documentation file |
| [`docs/instructions/testing.md`](docs/instructions/testing.md) | Writing, reviewing, or deciding whether to add tests for any code |
| [`docs/instructions/changelog.md`](docs/instructions/changelog.md) | Adding any user-facing change — to decide what belongs in `CHANGELOG.md` |

---

## Feature Documentation

Deeper design docs live in `docs/`:

| Document | Topic |
|----------|-------|
| [`docs/game-design/crocodile-puzzle.md`](docs/game-design/crocodile-puzzle.md) | Crocodile lock mechanic for Treasure Tombs |
| [`docs/game-design/pyramid-interior-design.md`](docs/game-design/pyramid-interior-design.md) | Interior loot model, node types, floor system, ward gates, tomb interior structure, perk table — **authoritative interior reference** |
| [`docs/game-design/game-loop.md`](docs/game-design/game-loop.md) | Three nested loops, level counts, conflict checks against other docs |
| [`docs/game-design/world-stability.md`](docs/game-design/world-stability.md) | Section-hash exploration, inventory-as-truth fragments, storage versioning |
| [`docs/game-design/worldgen-dsl-redesign.md`](docs/game-design/worldgen-dsl-redesign.md) | **In progress** — world-gen DSL value model (Structure/Loot/Population/Decoration layers), rank-based fragment assignment redesign |

---

## Key Files Quick Reference

| File                                    | Purpose                                |
| --------------------------------------- | -------------------------------------- |
| `src/game/random.ts`                    | Seeded random number generation        |
| `src/game/generateLevel.ts`             | Core puzzle level generation           |
| `src/game/generateRewardCalculation.ts` | Reward/loot calculation logic          |
| `src/data/journeys.ts`                  | All pyramid expedition definitions     |
| `src/data/tableaus.ts`                  | Tableau (puzzle blueprint) definitions |
| `src/data/difficultyLevels.ts`          | Difficulty scaling configuration       |
| `src/data/hieroglyphs.ts`               | Hieroglyph symbol definitions          |
| `src/data/inventory.ts`                 | Inventory item definitions             |
| `src/data/treasures.ts`                 | Treasure/tomb definitions              |
| `public/locales/en/common.json`         | English UI translations                |
| `public/locales/nl/common.json`         | Dutch UI translations                  |
| `.github/copilot-instructions.md`       | GitHub Copilot-specific instructions   |
