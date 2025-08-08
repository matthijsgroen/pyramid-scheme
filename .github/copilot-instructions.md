# 🏺 Pyramid Scheme — AI Coding Agent Instructions

## Big Picture Architecture
- **React + TypeScript + Vite**: The game is a modular React app with strong type safety and fast dev workflow.
- **Game Structure**: Core gameplay is split into Pyramid Expeditions (progressive puzzles) and Treasure Tombs (unlockable vaults). Each journey and tomb is defined in `src/data/journeys.ts` and `src/data/tableaus.ts`.
- **Puzzle System**: Puzzles are generated deterministically using seeded random logic (`src/game/random.ts`). Tableaux (puzzle blueprints) drive level content and difficulty scaling.
- **State Management**: Game state (progress, inventory, logs) is managed in `src/app/state/` using custom hooks and context.
- **Internationalization**: All UI and game text is localized via `src/i18n/` and `public/locales/`.
- **UI Components**: Reusable, themed components live in `src/ui/`. Storybook is used for documentation and visual testing.

## Developer Workflows
- **Dev Server**: `yarn dev` (http://localhost:9164)
- **Testing**: `yarn test` (Jest)
- **Type Checking**: `yarn check-types`
- **Linting**: `yarn lint` (Tailwind class order enforced)
- **Build**: `yarn build`
- **Storybook**: `yarn storybook`
- **Translations**: Edit `public/locales/en/common.json` and `public/locales/nl/common.json` for i18n.

## Project-Specific Conventions
- **Tailwind CSS**: Class order is enforced by linter; always use canonical order in JSX.
- **Puzzle Generation**: Always use deterministic random functions for puzzle and reward logic (`mulberry32`, `generateNewSeed`).
- **Component Structure**: UI components are highly themed (Egyptian style) and documented in Storybook. Use props for customization.
- **Game Data**: All journeys, tableaus, and difficulty levels are defined in `src/data/`. Never hardcode game logic in UI files.
- **State Hooks**: Use hooks from `src/app/state/` for all game progress, inventory, and log operations.
- **Internationalization**: Use `useTranslation` from `react-i18next` for all user-facing text.

## Integration Points & Patterns
- **Expedition Flow**: `TombExpedition` and `PyramidExpedition` orchestrate puzzle progression, completion, and reward logic.
- **Reward Logic**: Use `generateRewardCalculation` and inventory hooks for loot awarding.
- **Overlay/Backdrop**: Use themed backdrop components (e.g., `TombBackdrop`) for puzzle screens.
- **Storybook**: All new UI components should have a Storybook story in `src/ui/`.
- **CI/CD**: GitHub Actions workflow in `.github/workflows/deploy.yml` handles deploys; version checks are conditional on event type.

## Key Files & Directories
- `src/app/` — Main app, pages, state, expedition logic
- `src/data/` — Game data, journeys, tableaus, difficulty
- `src/game/` — Core game logic, randomization, reward calculation
- `src/ui/` — Themed UI components, Storybook stories
- `src/i18n/` & `public/locales/` — Internationalization
- `.github/workflows/` — CI/CD workflows

## Example Patterns
- **Puzzle Generation**: See `TombExpedition.tsx` for how tableaus and seeds are used to generate puzzles.
- **Reward Calculation**: See `generateRewardCalculation.ts` and inventory hooks for loot logic.
- **Backdrop Usage**: See `TombBackdrop.tsx` for Egyptian-themed backgrounds.
- **Storybook**: See `TombBackdrop.stories.tsx` for component documentation.

---

If any conventions or workflows are unclear, please ask for clarification or examples from the codebase. Iterate and update this file as new patterns emerge.
