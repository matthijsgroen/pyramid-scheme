# Storybook Story Guidelines

## The core rule

**A story must not contain logic that would need to be kept in sync with the game.**

If a bug in a story's local code could make the story *lie* about what the game actually does, that code belongs in core — not in the story. A story's job is to wire up inputs and observe outputs.

---

## Decision process

When writing logic in a story, ask:

1. **Does the game already have a function that does this?**
   → Use it. Never clone it.

2. **Would a bug here make the story show incorrect game behaviour?**
   → Extract to core first, then call it from both the story and the game.

3. **Is this pure display/formatting with no game equivalent?**
   → A simple local helper is acceptable. It becomes a flag to extract when the game builds real UI for it.

4. **Is this setup data (config literals, mock props)?**
   → Fine locally. Same as a unit test fixture.

Stop and extract to core before writing more than a few lines of story logic that isn't setup data or pure display.

---

## Boundaries

### What belongs in a story

- **Config/data literals** — inline `FloorConfig`, mock props, Storybook args
- **Local `useState` holding game-shaped data** — use the same TypeScript types as the game, hold them in local state, reset on reload
- **Calls to real game functions** — assembly, navigation, cell completion, puzzle generation, etc.
- **Simple display helpers with no game equivalent** — a label or colour derived from a data type, when the game has no shared utility for it yet
- **Story-only layout** — wrappers, padding, background colours

### What does NOT belong in a story

- **A reimplementation of a function that exists in core** — the story will silently diverge when core changes
- **A derived value the game computes** — if the game has a function that produces it, call that function
- **A stateful algorithm the game runs** — selection logic, seed derivation, scoring — these must be in core and called from both game and story

---

## State management pattern

Stories do **not** use game state hooks directly — those are backed by persistent storage and bleed between story reloads.

Instead:

- Use the same **TypeScript types** as the game for local state shape
- Call real **game functions** for mutations and computations
- Store in **`useState`** — local to the story, resets on reload

```tsx
// Good — local state, real types, real game hook for the computed grid
const [exploredSections, setExploredSections] = useState<Record<string, string[]>>({})
const { grid } = useAssembledFloor(id, config, seed, 0, exploredSections, ...)

// Bad — reimplementing what the game hook already does
const [grid, setGrid] = useState(() => buildMyOwnGrid())
```

---

## Display helpers

If the game already has UI that renders a piece of data (a reward, a label, a status), use the same source. If no game UI exists for it yet, a simple local switch or map is acceptable — but note it as a candidate for extraction when the game builds that UI.

---

## When to extract to core first

Extract before writing the story when:

- The logic determines **what the player receives** (loot, rewards, treasure selection)
- The logic determines **what state the game is in** (exploration, completion, unlocks)
- The logic involves **seeded randomness** — if the seed or selection formula differs between story and game, the story shows wrong data
- The same logic is needed in **more than one place**

Do not extract when:

- It is a config literal or fixture
- It is a display label/colour with no existing game equivalent
- It is story scaffolding (layout, reset buttons, debug controls)
