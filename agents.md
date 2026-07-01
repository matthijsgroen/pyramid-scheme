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

All new components in `src/ui/` should have a corresponding Storybook story. Stories must not contain shadow implementations of game logic — see **[`docs/instructions/storybook.md`](docs/instructions/storybook.md)** for the full guidelines.

### 7. TypeScript Strictness

The project uses strict TypeScript. Avoid `any` types; define proper interfaces and types, preferably co-located with the code they describe.

### 8. Domain / App / Design-System Layer Boundaries

Code is split into three layers with strict one-way dependencies (domain ← app ← ui):

| Layer | Location | Rule |
|-------|----------|------|
| **Domain** | `src/game/` | Pure TypeScript — data types, generation functions, validation functions. No React, no DOM, no rendering. |
| **App** | `src/app/` | Stateful React — pages, state hooks, orchestration. May import from domain and design system. |
| **Design system** | `src/ui/` | Stateless React components. Props in, JSX out. No game state, no domain imports. |

Concretely for the site map system:
- `src/game/siteTypes.ts` — `FloorConfig`, `SiteLayout`, all data types
- `src/game/siteAssembler.ts` — `assembleFloor()` pure function
- `src/game/siteValidator.ts` — `validateSite()` / `validateJourney()` pure functions
- `src/app/SiteMap/SiteMapView.tsx` — SVG renderer, receives layout + nav state as props
- `src/app/SiteMap/useSiteNavigation.ts` — pure nav-state computation hook (no storage)
- `src/app/SiteMap/SiteMapScreen.tsx` — stateful page that wires storage → hooks → view

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

1. Create the component in `src/ui/`
2. Add a Storybook story in `src/ui/<ComponentName>.stories.tsx`
3. Use Tailwind for styling (canonical class order)
4. Expose customization via props

### Adding a New Translation Key

1. Add the key and English value to the appropriate file under `public/locales/en/`
2. Add the Dutch equivalent to the corresponding file under `public/locales/nl/`
3. Consume with `useTranslation` in the component

---

## CI/CD Pipeline

| Workflow     | Trigger                 | What it does                                                                     |
| ------------ | ----------------------- | -------------------------------------------------------------------------------- |
| `test.yml`   | Push / Pull Request     | Type checks, lint, tests, build verification; posts version change notice on PRs |
| `deploy.yml` | Push to `main` / manual | Deploys to GitHub Pages only if `package.json` version has changed               |

Deployments only happen on version bumps — increment `version` in `package.json` to trigger a deploy.

---

## Testing Strategy

- **Unit tests**: Co-located with source files (e.g., `generateLevel.spec.ts` next to `generateLevel.ts`)
- **Component tests**: Use `@testing-library/react` with `jsdom`
- **Visual tests**: Storybook stories serve as visual regression reference

Run all tests: `yarn test`

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

---

## Feature Documentation

Deeper design docs live in `docs/`:

| Document | Topic |
|----------|-------|
| [`docs/crocodile-puzzle.md`](docs/crocodile-puzzle.md) | Crocodile lock mechanic for Treasure Tombs |
| [`docs/treasure-effects.md`](docs/treasure-effects.md) | Treasure passive effects system — material tiers, all effect types, implementation notes |
| [`docs/handover-treasure-effects-implementation.md`](docs/handover-treasure-effects-implementation.md) | Implementation handover — what's done, what to build, order of work, code patterns |
| [`docs/game-loop.md`](docs/game-loop.md) | Three nested loops, level counts, conflict checks against EXPEDITION_REDESIGN and other docs |
| [`docs/pyramid-interior-design.md`](docs/pyramid-interior-design.md) | Interior loot model, node types, floor system, ward gates, tomb interior structure, per-tier templates |

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
