# Game World Model

Status: reference doc · 2026-06-27  
Companion to: `docs/game-loop.md`, `docs/pyramid-interior-design.md`, `IMPLEMENTATION_PLAN.md`

---

## Hierarchy

```
Tier (difficulty)
└── Journey / Expedition  (4 per tier)
    └── Pyramid visit     (levelCount per journey, each its own SiteConfig)
        └── Site          (floors + branches, defined by SiteConfig)
            └── Floor     (one grid of rooms, corridors, gates)
```

### Tier

Five difficulty levels in order: **starter → junior → expert → master → wizard**.

Each tier contains four pyramid journeys and one or more treasure tombs.

### Journey / Expedition

A named expedition (e.g. "Dawn at the Sphinx"). Defined in `src/data/journeys.ts`.

| Field | Meaning |
|---|---|
| `id` | Unique key, e.g. `"starter_1"` |
| `difficulty` | Tier this journey belongs to |
| `levelCount` | How many pyramid visits occur in this journey |
| `siteConfigs` | Array of `levelCount` SiteConfigs, one per pyramid visit |

### Pyramid visit

One pyramid the player enters and explores during a journey. There are `levelCount` of them per journey.

**Each pyramid has its own `SiteConfig`** — a distinct authored layout with its own branch structure, ward gates, and rewards. Two pyramids in the same journey can look entirely different.

The seed still varies per visit (topology changes), but the SiteConfig also changes (branch structure and wards change).

### Ward gates — inter-tier locking

Branch sections can be locked by **ward gates** requiring a tomb key from a *different* tier:

```
starter pyramid 2, branch A → gated by junior tomb key
starter pyramid 3, branch B → gated by expert tomb key
```

This means:
- On first visit, the player can only reach ungated branches
- After completing a junior-tier tomb, the junior ward opens — the player revisits starter_1 pyramid 2 and the branch is now accessible
- Earlier sites remain **dormant**, not spent: they always have content waiting

Ward gate keys are authored in the `SiteConfig` by a specific `keyId` that matches the relevant tomb's ward key treasure.

### Site

One pyramid interior. Configured by a `SiteConfig` (`FloorConfig[]`):

| Field | Meaning |
|---|---|
| `pathPuzzles` | Number of puzzle rooms on the main path |
| `chestEvery` | How often a chest appears along the main path |
| `sideSections` | Branch corridors off the main path (gates, endRewards) |
| `mainEndReward` | What the player finds at the end of the main path |
| `exitOrStaircase` | Whether completing the main path ends the site or descends a floor |

Multi-floor sites have one `FloorConfig` per floor; floor 0 is the surface.

---

## Key numbers

| Journey | levelCount (pyramids) | pathPuzzles per pyramid |
|---|---|---|
| starter_1 | 3 | 2 |
| starter_2 | 4 | 2 |
| starter_3 | 5 | 3 |
| starter_4 | 5 | 3 |
| junior_1 | 3 | 3 |
| junior_2 | 6 | 4 |
| junior_3 | 8 | 5 |
| junior_4 | 5 | 4 |
| expert_1 | 4 | 4 |
| expert_2 | 6 | 5 |
| expert_3 | 9 | 6 |
| expert_4 | 7 | 5 |
| master_1 | 4 | 5 |
| master_2 | 9 | 7 |
| master_3 | 8 | 7 |
| master_4 | 5 | 6 |
| wizard_1 | 9 | 8 |
| wizard_2 | 11 | 8 |
| wizard_3 | 10 | 8 |
| wizard_4 | 8 | 8 |

**`levelCount`** = how many distinct pyramids the player visits in this journey.  
**`pathPuzzles`** = the main-path puzzle count; applies equally to every pyramid in the journey (the path length is consistent — the branches and wards are what vary).

---

## World builder (`scripts/worldGen/`)

Generates `src/data/generatedWorld.ts` — **`levelCount` SiteConfigs per journey**, indexed by pyramid number (0-based).

The world builder is responsible for:
- **Per-pyramid layout**: each pyramid in a journey gets its own `SiteConfig`, potentially with different branch types and ward tiers
- **Reward placement**: hieroglyph fragments assigned to chest slots across all pyramids in all journeys
- **Ward placement**: which pyramids get ward-gated branches, and which tier's key unlocks them
- **Fragment distribution**: no two fragments of the same hieroglyph in the same journey; spread across same-tier and adjacent-tier journeys

The world builder does **not** control grid topology (which rooms connect where). That is the assembler's job (`src/game/siteAssembler.ts`), run at runtime with the visit seed.

### Authoring intent for per-pyramid variation

Within a journey, pyramids should escalate in complexity:
- **First pyramid**: typically ungated — accessible immediately, introduces the site
- **Later pyramids**: progressively add ward-gated branches from higher tiers (junior, expert, …)
- **Ward tier**: a branch gated by a junior ward key can appear in a starter journey — the player returns once they have junior tomb keys

Example for `starter_1` (3 pyramids):
```
Pyramid 1: main path only (no branches)
Pyramid 2: main path + 1 ungated branch (fragment)
Pyramid 3: main path + 1 ungated branch (fragment) + 1 junior-ward branch (mapPiece/mosaicPiece)
```

---

## Current implementation gap

**`generatedWorldConfigs` currently stores one `SiteConfig` per journey**, not an array. This must change to `SiteConfig[][]` (per journey → per pyramid).

`SiteMapScreen` does not yet accept a `pyramidIndex`. It renders the single stored config. When the multi-pyramid model is implemented:

- `generatedWorldConfigs` type: `Record<string, SiteConfig[]>` (array per journey)
- `PyramidJourney.siteConfigs`: `SiteConfig[]` (was `siteConfig?: SiteConfig`)
- `SiteMapScreen` props: add `pyramidIndex: number`
- `useJourneys` state: `solvedEdges` keyed per pyramid (`journeyId:pyramidIndex:floorIdx:row,col`)
- World builder: generate `levelCount` configs per journey instead of one

---

## Where things live

| Concern | File |
|---|---|
| Journey definitions (levelCount, names, difficulty) | `src/data/journeys.ts` |
| Per-pyramid site configs (authored layout + rewards) | `src/data/generatedWorld.ts` (generated) |
| World builder source | `scripts/worldGen/` |
| Floor grid assembly (topology from seed) | `src/game/siteAssembler.ts` |
| Navigation and fog-of-war | `src/game/gridNavigation.ts` |
| Validator | `src/game/siteValidator.ts` |
| Runtime screen | `src/app/SiteMap/SiteMapScreen.tsx` |
| Storybook inspector | `src/app/SiteMap/JourneyInspector.stories.tsx` |
