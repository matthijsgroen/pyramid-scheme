# Slice plan — §G: authoring selectors for encounter placement

Discussion 2026-07-15. §G's crocodile item was reframed: not "wire `lastMainPuzzleFamily`", but
give the authoring layer a **general selector vocabulary** so new placement intents are *authored*,
not new code fields each time. `lastMainPuzzleFamily` is a hardcoded one-position selector
(`siteAssembler.ts:934-938`: room family = `lastMainPuzzleFamily` if last, else `encounter`); the
job is to generalize it.

## Grammar (agreed)

A path is a chain of encounter nodes (`pathPuzzles: N` → N nodes). Any path — main path AND every
side/sub section — may carry selectors that assign an encounter preference to chosen positions:

```ts
type NodeSelector = {
  where: "first" | "last" | number | { every: number; from?: number } // 1-based positions
  encounter?: string | string[]   // FAMILY-SWAP (build now): role/tag for the selected node(s)
  // gate?: GateSpec               // GATE-INJECTION (designed below, NOT built)
}
// on FloorConstraint AND SideSectionConstraint:
nodes?: NodeSelector[]
```

Unselected nodes fall back to the path's `encounter` default. On conflict, **later selector in the
array wins** (author controls order; `every` then an explicit `last` override reads naturally).

Examples:
- capstone (replaces `lastMainPuzzleFamily`): `nodes: [{ where: "last", encounter: "capstone" }]`
- every 3rd a trap: `nodes: [{ where: { every: 3 }, encounter: "trap" }]`
- the 4th node specific: `nodes: [{ where: 4, encounter: "arithmetic-reflex" }]`

## Build now — family-swap only

### Resolved representation
Replace the last-only `lastMainPuzzleFamily` with a per-node override map. On the resolved
`FloorConfig`/`SubSection`:
- keep `encounter` (chain default — unchanged),
- add `encountersByIndex?: Record<number, string | string[]>` (sparse; a role/family per selected
  0-based node index). `lastMainPuzzleFamily` is **removed** — `{where:"last"}` resolves to
  `encountersByIndex[N-1]`.

### Flow (each stage already has an analog for `encounter`/`lastMainPuzzleFamily`)
1. **DSL** (`dsl.ts`): add `NodeSelector` + `nodes?` to `FloorConstraint` + `SideSectionConstraint`.
2. **Resolve positions** (`buildSite.ts`/`sideSections.ts`): expand `nodes` selectors → sparse
   `encountersByIndex` (roles) against the path's `pathPuzzles` count. Pure position math; the one
   place `where` → indices happens.
3. **Allocate roles→families** (`placeEncounters.ts`): today allocates `encounter` (seed "main") +
   `lastMainPuzzleFamily` (seed "cap"). Extend to also allocate each `encountersByIndex[k]` role,
   seeded per node. (Single-family pools — capstone→crocodile, tomb-puzzle→tableau — make seed
   irrelevant for tombs, so the capstone migration stays byte-identical.)
4. **Assemble** (`siteAssembler.ts:934-938`): room k family = `encountersByIndex[k] ?? encounter`
   (replaces the `isLast ? lastMainPuzzleFamily : encounter` branch).
5. **Loot weight** (`slots.ts:113`): puzzle-slot rewardWeight = `familyWeightFor(encountersByIndex[k]
   ?? encounter)` — per node, so a trap node (weight 0) in a chain is loot-ineligible while its
   neighbours bear loot. (Overlaps §A.3's deferred per-node eligibility; this delivers part of it.)
6. **Serialize** (`serializer.ts`): emit `encountersByIndex`; drop `lastMainPuzzleFamily`.
7. **Migrate**: `configBuilder` tomb builder stops setting `lastMainPuzzleFamily`; the 8 non-starter
   tomb specs author `nodes: [{ where: "last", encounter: "capstone" }]` + `pathPuzzles: 2` on their
   last floor. `capabilities`/`FamilyMeta.minTier` still blocks starter (capstone→crocodile only
   from junior up), so a starter tomb authoring a capstone still resolves to none.

### Byte-identity target
Tomb capstone migration: byte-identical (single-family pools + `encounter` keeps seed "main"). Any
NEW selector use (every-nth-trap etc.) changes the world only where authored. Reward counts unchanged.

## Design only — gate-injection (impact, NOT built)

A `gate` selector (`{ where: n, encounter: "gate", gate, end?, endReward? }`) would place a ward/floor
gate as a mid-path node. Impact is materially larger than family-swap because a gate is not a family
swap — it changes path **topology** and touches the keys solver:

- **Topology**: today gates live on *side sections* (`gate` + `end: staircase|treasure`), never
  mid-main-path. A gate at main-path position n splits the chain (nodes before it, a lock, then a
  continuation/target). `initPuzzleChains` + the maze assembler treat `pathPuzzles` as a linear
  puzzle chain — they'd need to place a gate cell mid-chain and route the continuation. Non-trivial
  assembler work.
- **Key + target authoring**: a gate needs a `requiredKeyId` (or key spec) AND what's behind it
  (staircase / treasure / loot). "Long path full of ward gates, treasures at the end" = gate→gate→
  …→treasure, each gate a distinct key. The selector shape must carry key + end + reward per node.
- **Keys-and-locks solver (§E) interaction**: every injected gate's key must be reachable/placeable.
  Mid-path gates become discovered locks on the worklist; the reachability fine-BFS already handles
  section gates, but mid-*main-path* gates are a new frontier shape. Winnability + the "key never
  behind its own gate" invariant must hold per injected gate.
- **Loot slots**: a gate node bears no loot (weight 0) but its target (treasure end) does — the slot
  model must attach the reward to the gate's target, not the gate node.

**Verdict**: family-swap is contained (per-node family, zero topology change, ~7 files, capstone
byte-identical). Gate-injection is a separate, larger slice that reopens the maze assembler + the §E
solver — worth doing as its own slice if/when the "authored ward-gate gauntlet" content is wanted;
the grammar (`gate?` on the same `NodeSelector`) extends cleanly, so building family-swap now doesn't
foreclose it.

## Verification (family-swap build)
`yarn tsc -b`, `yarn test --run`, `yarn build`, `yarn lint`, `yarn generate-world`. Capstone
migration byte-identical (`git diff --stat src/data/generatedWorld.ts` empty); reward counts stable.
Add a `nodes`-selector unit test (positions → encountersByIndex). Doc-fidelity review; commit + push.
