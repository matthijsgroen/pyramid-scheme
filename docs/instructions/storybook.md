# Storybook Story Guidelines

## The core rule

**A story must not contain logic that would need to be kept in sync with the game.**

If a bug in a story's local code could make the story *lie* about what the game actually does, that code belongs in core — not in the story.

A story's job is to wire up inputs and observe outputs. It is a thin harness, not a second implementation.

---

## Decision flowchart

```
Does the game already have a function or hook that produces this value?
  └─ YES → use it. Never clone it.
  └─ NO  → a local approximation is acceptable, but it is a flag:
            extract to core when the real implementation is built.
```

---

## What is acceptable in a story

| Acceptable | Example |
|---|---|
| Inline config/data literals | `const config: FloorConfig = { pathPuzzles: 2, ... }` |
| Local `useState` holding game-shaped data | `useState<Record<string, string[]>>({})` for explored sections |
| Calling real game functions for mutations | `encodeEdge(...)`, `completeCell(...)`, `assembleFloor(...)` |
| Simple display helpers with no game equivalent | `const label = reward.type === "mosaicPiece" ? "Mosaic" : "Treasure"` |
| Story-only layout wrappers | `<div className="p-4 bg-stone-900">` |
| Mock props / Storybook args | `args: { difficulty: "expert" }` |

---

## What is NOT acceptable in a story

| Not acceptable | Why | What to do instead |
|---|---|---|
| Reimplementing a function that exists in core | The story will silently diverge when core changes | Import and call the real function |
| Computing a derived value the game computes | Same divergence risk | Call the game function that computes it |
| Duplicating `encodeEdge` / `decodeEdge` | Already exported from `useAssembledFloor` | `import { encodeEdge, decodeEdge } from "./useAssembledFloor"` |
| Custom grid masking / dir-stripping | Lives in `useAssembledFloor` | Use the hook with the appropriate `detectionLevel` |
| Shadow exploration state machine | Lives in `useAssembledFloor` + `useJourneys` | Use the hook; hold state as `useState<Record<string,string[]>>` |
| Full algorithm re-implementations | e.g. treasure selection, reward calculation | Extract to a core function first, then call it from both game and story |

---

## State management in stories

Stories do **not** use game state hooks (`useJourneys`, `useProgression`) directly — those are backed by localStorage and bleed between story reloads.

Instead:

- **Data shape**: use the same TypeScript types as the game (`Record<string, string[]>` for `exploredSections`, etc.)
- **Mutation logic**: call real game functions (e.g. `completeCell`, `assembleFloor`)
- **Storage**: `useState` — local to the story, resets on reload

```tsx
// Good
const [exploredSections, setExploredSections] = useState<Record<string, string[]>>({})
const { grid, explorerPos } = useAssembledFloor(JOURNEY_ID, config, SEED, 0, exploredSections, ...)

// Bad
const [grid, setGrid] = useState<FloorGrid>(buildMyOwnGrid()) // shadow
```

---

## Display helpers

If the game already renders a reward, a label, or a colour in its own UI, use the same source. If no game UI exists for it yet, a simple local helper is fine — but it is a flag to extract when the UI is built.

```tsx
// Fine — no game UI for this yet, simple enough that divergence is low risk
const label = reward.type === "mosaicPiece" ? "Mosaic" : reward.type

// Not fine — ChestRewardFlow already renders rewards; use a shared display util
const rewardLabel = (r: TreasureReward) => { /* 20-line reimplementation */ }
```

---

## When to extract to core first

Before writing story logic, ask: *does this logic need to be correct to make the story trustworthy?*

- Grid assembly → `assembleFloor()` ✓ already in core
- Cell state application → `completeCell()` ✓ already in core
- Edge ID encoding → `encodeEdge` / `decodeEdge` ✓ already exported from `useAssembledFloor`
- Hidden cell masking → `useAssembledFloor` with `detectionLevel` ✓ already in core
- Treasure selection algorithm → **extract first, then use in both game and story**
- Reward display labels → **extract first if already rendered in game UI**

If you find yourself writing more than ~5 lines of logic in a story that isn't setup data, stop and ask whether it should be in core.
