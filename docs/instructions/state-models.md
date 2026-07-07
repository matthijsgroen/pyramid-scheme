# Puzzle State Models (DDD)

For any puzzle family with non-trivial in-progress state (a grid of cell
states, marks, a partial solution — Sumplete, and future families like it),
model that state as a domain object in `src/game/`, independent of React.
Sumplete is the reference implementation (`src/game/sumpleteState.ts`,
`src/game/sumpleteStatus.ts`).

## Shape

Split into three pieces, all pure TypeScript, all in `src/game/`:

1. **State type** — `type FooState = { ... }` plus a `createFooState(...)`
   factory. This is the whole shape of "what's true about a puzzle in
   progress." No React, no `useState` shape leaking in.
2. **Actions (mutations)** — one function per player move, named for the
   move (`toggleFooCell`, `placeFooTile`), not `updateState`. Implement with
   [immer](https://immerjs.github.io/immer/)'s `produce`, either wrapped
   (`produce((state, ...args) => { state.x = y })`) or curried via
   `produce(recipe)` so the action is directly `(state, ...args) => FooState`.
   Never hand-roll spread/copy chains for nested mutation — that's what
   immer replaces.
3. **Checks (queries)** — plain functions computing derived facts (line
   statuses, `isFooSolved`), taking state (or its fields) in, returning a
   value out. No mutation, no side effects.

## Wiring into React

The `src/app/` wrapper owns a single `useState<FooState>` (seeded by
`createFooState`) and calls the domain action inside the setter:

```tsx
const [state, setState] = useState(() => createFooState(n))
const toggle = useCallback((r: number, c: number) => setState(prev => toggleFooCell(prev, r, c)), [])
```

The wrapper never touches `state.cells` (or equivalent) directly — every
change goes through a named domain action. Checks are called each render
from the current state to derive props for `src/ui/`.

## Why

- Keeps `src/game/` portable (testable in isolation, no React needed) per
  the [layer architecture](architecture.md).
- Named actions read as the game's vocabulary instead of generic state
  setters, and are trivial to unit test without rendering anything.
- immer removes the nested-copy bugs that hand-written
  `prev.map(row => [...row])`-style updates are prone to as state shape
  grows.

## When NOT to do this

A puzzle family with state that's just a single primitive or flat value
(e.g. "current guess index") doesn't need this split — a plain `useState`
call in the `src/app/` wrapper is enough. Reach for the state/actions/checks
split when there's a grid, nested structure, or more than one kind of move.
