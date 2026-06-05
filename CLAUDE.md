# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

For full architecture, conventions, workflows, and key file reference see **[agents.md](agents.md)**.

## Quick Commands

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
