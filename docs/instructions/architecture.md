# Layer Architecture

## The layers

The codebase has three strict layers with one-way dependencies: domain ← app ← ui.

```
src/game/   domain logic
src/data/   domain data
src/ui/     design system (rendering only)
src/app/    state, flow, and composition
```

`src/support/` and `src/components/` are transitional; absorb their contents into the three layers when touching those files. Pure utilities go to `src/game/` or `src/data/`, React hooks go to `src/app/`, shared stateless components go to `src/ui/`.

---

## Domain layer — `src/game/` and `src/data/`

**Rule: pure TypeScript only. No React, no DOM, no i18n, no framework imports of any kind.**

The domain layer must be portable — it could run in a CLI, a test runner, or a different UI framework without changes.

- `src/game/` — puzzle generation, seeded randomisation, reward calculation, site assembly, navigation, validation
- `src/data/` — journey definitions, tableau blueprints, difficulty settings, hieroglyphs, inventory items, treasures

**Violations to avoid:**
- Importing from `react`, `react-dom`, or any framework package
- Referencing `document`, `window`, or any DOM API
- Calling `useTranslation` or any i18n hook
- Importing from `src/app/` or `src/ui/`

---

## Design system layer — `src/ui/`

**Rule: stateless components. Props in, JSX out.**

`src/ui/` components are leaf renderers. They receive everything they need as props and return JSX. They do not manage state, run effects, or know about the game.

**Allowed:**
- `useRef` — for DOM operations only (focus management, element measurement). Holds a DOM handle, not state.
- Props for event callbacks — `onClick`, `onChange`, etc. passed from the caller.
- Inline display logic — a `switch` on a prop value, a conditional class. Not game logic.

**Not allowed:**
- `useState` — any interactive state (open/closed, animation phase, input value) belongs in a wrapper in `src/app/`
- `useEffect` — no side effects; any derived state is either a prop or computed inline from props
- `useTranslation` or any i18n hook — translated strings are passed as props by the caller
- Any import from `src/game/`, `src/data/`, or `src/app/`
- Any game-state hook (`useJourneys`, `useInventory`, etc.)

**The wrapper pattern:** when a ui/ component needs interactivity, keep the component stateless and add a thin wrapper in `src/app/` that holds state and passes it as props. The wrapper composes; the component renders.

---

## App layer — `src/app/`

**Rule: state, flow, and composition. No HTML/CSS of its own.**

The app layer wires state to UI. It calls game functions, manages React state and context, and composes components from `src/ui/`. It does not render HTML or apply CSS classes directly — that belongs in `src/ui/` components.

- State hooks in `src/app/state/` — access and mutate game state (progress, inventory, journey logs)
- Orchestration components — call `useTranslation`, derive props, pass them to ui/ components
- Wrappers — thin stateful shells around stateless ui/ components when interactivity is needed

**Violations to avoid:**
- `className="..."` in app/ components — extract the rendering into a ui/ component
- Game logic reimplemented in a component — use functions from `src/game/`
- Calling `useJourneys`, `useInventory`, etc. inside `src/ui/` components

**Current state:** some app/ components still contain `className` from before this rule was established. These are aspirational migrations — fix when you naturally touch the file, not as up-front cleanup.

---

## Dependency direction

```
src/ui/     can import:  nothing from src/ (only React, external libs)
src/game/   can import:  src/data/, src/support/ (pure only)
src/data/   can import:  nothing from src/
src/app/    can import:  src/game/, src/data/, src/ui/
```

A cycle or upward import (ui/ importing from app/, game/ importing from ui/) is always a bug.

---

## Decision guide

When adding code, ask which layer it belongs in:

| Question | Answer | Layer |
|---|---|---|
| Is this pure computation with no side effects? | Yes | `src/game/` or `src/data/` |
| Does it render HTML/CSS? | Yes | `src/ui/` |
| Does it hold game state or orchestrate flow? | Yes | `src/app/` |
| Does it need local interactivity (open/close, animation)? | Yes | `src/app/` wrapper around a `src/ui/` component |
| Is it a cross-cutting pure utility? | Yes | `src/game/` (if game-specific) or inline where used |
