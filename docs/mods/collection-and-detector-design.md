# Design — mod-owned Collection sections, design-system extraction, detector revival

Status: **DS-1 + MOD-1 shipped. DET-1 now in design** (this effort) — it grew past
the old "counter-model compass revival" (§3C) into the full **detector + perk +
tomb-treasure-collection** design in **§7 (authoritative)**. §3C/Appendix A are the
older, narrower record; where they conflict with §7, §7 wins.

Origin: reviving §F (treasure perks "dead but shipped-looking", FIDELITY-AUDIT). The
perks are the *unlock* for the detectors, the tomb treasures are where they're granted,
and the Collection is where they're shown — one interlocking system, designed in §7.

Sequencing (all of it) is in §8.

---

## 1. Why

Slice 2 gated the hieroglyph Collection section with
`getCurrencyMeta("fragment")?.showInCollection` in `Collection.tsx`. That
*hides* the section when the mod's off — but the section's components still live
in core (`src/app/pages/Collection.tsx`), so core still owns hieroglyph UI. The
mod-container target (TARGET.md: `mods/<name>/app/` owns the mod's UI) wants the
section **contributed by the mod**, with core naming nothing.

Two adjacent problems surfaced while looking:

- **Collection hand-rolls its layer.** No `Section` / `CategoryGrid` /
  `CollectibleSlot` primitives — the section header, grid, progress badge, and
  empty-slot logic are triplicated across three page-local components. A
  mod-contributed section would either duplicate that markup again or depend on
  page-local code. It needs a design-system layer to build on.

- **The compass is dead in production.** `DetectorPanel` is fed
  `availableHieroglyphs={[]}` (hardcoded, `SiteMapScreen.tsx:306`), so the
  target `<select>` is empty and the player can never pick a hieroglyph to hunt.
  It lives only in the SiteMap HUD, never touches Collection, and results are a
  3-line text readout with no map navigation. Collection is the natural home for
  target-picking ("you see Ra 3/5 → tap to hunt it").

---

## 2. Current state (ground truth)

### Collection (`src/app/pages/Collection.tsx`)
- Three near-identical local components: `CategorySection` (hieroglyphs, `:43`),
  `TreasureCategorySection` (`:110`), `SellableCategorySection` (`:152`). Each
  hand-writes a `<div className="mb-8">` wrapper, a `bg-clip-text` `<h2>` header
  (color swapped per section), a `grid grid-cols-*` grid, and per-item
  collected/empty/selected logic.
- Hieroglyph section gate (post-slice-2): the four `CategorySection` renders
  (deities/professions/animals/artifacts) wrapped in `showHieroglyphCollection`.
- Reads fragment counts via `progression.hieroglyphFragments` +
  `hieroglyphProgress(id).required`.

### The tile (`src/ui/atoms/HieroglyphTile.tsx`)
- One tile renders **all three** collectible kinds (hieroglyph / treasure /
  sellable) plus the detail panel.
- Props: `symbol`, `difficulty`, `size`, `selected`, `disabled`, `empty`,
  `fragmentProgress: {found,required}`, `onClick`, `className`.
- Difficulty→visual is **hand-rolled inline** — the same 5-way ternary repeated
  three times (tile gradient, drop-shadow element, symbol color). ~200 lines of
  inline `style`.

### Difficulty→color (three sources, two *roles*)
- **Material hue** (stone/orange/slate/yellow/emerald): `HieroglyphTile` inline
  + `hieroglyphLevelColors.ts` (used by `TombLockPanel`, `TombTableau`). Same
  hues, two implementations.
- **Rank badge** (green/blue/yellow/orange/purple): `DifficultyPill.tsx:10`.
- These are **not** the same thing — material ≠ rank. Consolidation names both
  as token maps; it does not merge them into one.

### Detector (`src/app/state/useDetector.ts`, `DetectorPanel.tsx`)
- `useDetector(progression, journeys)` — instantiated **only** in
  `SiteMapScreen.tsx:48`. State (`activeDetector`, `compassTarget`) is ephemeral
  `useState`, **not persisted**, scoped to the SiteMap screen.
- `compassResults`: scans **all** `generatedWorldConfigs` for fragment rewards
  of the target, filters out already-collected pieces via
  `progression.hasFragment(id, pieceIndex)`. Not reachability-aware. Result is
  `{journeyId, levelIdx, floorIdx, hieroglyphId, pieceIndex}`.
- `DetectorPanel` renders in the HUD; `availableHieroglyphs={[]}` ⇒ target
  select is empty ⇒ **feature unreachable in production**.
- Gated behind `corePerks` (`compassLevel` etc.), unlocked by treasure keys —
  endgame. Results are text only; no map highlight/navigation.

---

## 3. Design

### 3A. Mod-owned Collection sections

**Pattern: mirror `registerAllFamilies`.** The descriptor
(`src/mods/modDescriptor.ts`) stays React-free because world-gen scripts import
it. App-side UI registers via a separate side-effect registry, exactly as family
plugins do today.

New app-side registry `src/app/pages/collectionSectionRegistry.ts`:

```ts
export type CollectionSection = {
  id: string            // e.g. "hieroglyph"
  order: number         // sort key among all sections
  Component: FC<CollectionSectionProps>  // renders itself from DS primitives
}
export const registerCollectionSection = (s: CollectionSection) => …
export const collectionSections = (): CollectionSection[] => // sorted by order
```

`CollectionSectionProps` gives a section what it needs without core knowing the
mod: the shared item-selection callback + selected item, and read access to
inventory/progression (or a narrower slice — see open question Q3).

- The hieroglyph section moves to `src/mods/hieroglyph/app/HieroglyphCollectionSection.tsx`
  and self-registers, **gated on `isModEnabled("hieroglyph")`**, in a
  `src/mods/hieroglyph/app/collection.ts` imported by a
  `src/mods/registerAllCollectionSections.ts` aggregator (parallel to
  `registerAllFamilies.ts`).
- `Collection.tsx` renders `collectionSections().map(s => <s.Component … />)` in
  its hieroglyph slot and names no hieroglyph. Treasures + junk **stay
  hand-coded in core** until their own mods are extracted (trap/shop slices) —
  same staging discipline as the rest of the restructure.

**Toggle-off:** mod out of `REGISTERED_MODS` → section never registers → nothing
renders, core references nothing. Same unfakeable gate as families.

Descriptor: no new field needed now (registration is a side-effect import like
families). If we later want the descriptor to *declare* its sections, that's the
`screen?` field TARGET.md:22 anticipates — defer until a second mod needs it
(don't invent the field early).

### 3B. Design-system primitives

Extract three primitives so both mod-contributed and core-owned sections compose
them instead of hand-rolling markup. Each gets a Storybook story (the repo's
signal for "design-system component").

1. **`CollectibleSlot`** (molecule) — one grid cell. Wraps `HieroglyphTile` and
   owns the collected / partial / empty / selected states + the count badge, so
   the three states aren't re-implemented per section. Props roughly:
   `{ symbol?, difficulty?, state: "empty"|"partial"|"collected", progress?: {found,required}, selected?, onClick? }`.
   Replaces the `Badge`+`HieroglyphTile`+ternary assembly currently inlined in
   each `*CategorySection`.

2. **`CollectionSection`** (molecule) — the `mb-8` wrapper + accented
   `bg-clip-text` header. Props: `{ title, accent, children }`. Replaces the
   triplicated section markup.

3. **`CategoryGrid`** (atom/layout) — the responsive `grid grid-cols-*`
   container. Props: `{ density?: "tight"|"wide", children }` mapping to the two
   breakpoint sets currently hand-tuned.

**Difficulty color tokens** — one module `src/ui/tokens/difficultyColors.ts`
exposing the two roles explicitly:
```ts
export const difficultyMaterial: Record<Difficulty, MaterialSpec>  // stone→emerald gradients + symbol color
export const difficultyRank: Record<Difficulty, string>            // green→purple pill classes
```
`HieroglyphTile` consumes `difficultyMaterial` (collapsing its 3× inline
ternaries into one lookup); `hieroglyphLevelColors.ts` becomes a thin re-export
or is replaced at its two call sites; `DifficultyPill` consumes `difficultyRank`.
No visual change intended — this is de-duplication, verified by story snapshots.

**Blast radius:** `HieroglyphTile` is shared by treasures + sellables, so the
material-token refactor touches all three collectible kinds. That's desirable
(single source) but means the DS slice must re-verify treasure/junk rendering,
not just hieroglyphs.

### 3C. Detector/compass revival — SUPERSEDED by §7/§8 (kept as P3 input)

**No longer deferred.** DET-1 is now designed in §7 and planned in §8; where this
older, narrower analysis conflicts with §7/§8, **§7/§8 win**. Kept because the
compass provider-search detail below (counter-native "looted = explored-state",
reachability-aware ranking, target-picking on Collection, shared/persisted
detector state) is concrete input for **P3** (tiered compass) — mine it there.

The feature is dead; reviving it under the **counter model** (fragments are a
player-facing counter, `pieceIndex` is meaningless — see the slice-2 decision):

**Target-picking on Collection.** A partially-collected hieroglyph slot
("Ra 3/5") becomes the affordance: tapping it (or a "hunt" action in the detail
panel) sets the compass target. This replaces the dead HUD `<select>` and makes
`availableHieroglyphs` unnecessary — the Collection grid *is* the picker.

**Counter-native provider search.** Today the compass filters nodes by
`hasFragment(id, pieceIndex)` (per-piece). Under the counter that identity is
gone. Redefine a "provider node" as: a world node whose reward is a fragment of
the target **and** whose room is **not yet looted**, where looted = the cell is
in `journeys` explored state (not a per-piece set). Then:
- filter to **reachable** nodes (owned ward keys / tier unlocked) — the user's
  "in an area reachable for the player";
- rank by proximity so the compass "locks onto the node that can provide it."

Key technical task: mapping a static-config fragment reward → its assembled cell
→ explored state. That plumbing (assemble floor, find the fragment room's edge,
check `getExploredSections`) is the real cost of the compass slice; it's why
this is its own slice, not part of the section work.

**Shared detector state.** `useDetector` is currently per-`SiteMapScreen`
ephemeral state. If Collection sets the target and the HUD shows results during
a run, `compassTarget` (at least) must be **hoisted to app-level context or
persisted**. Design: lift detector state to a provider (or persist
`compassTarget` in progression/journeys), so picking on Collection survives
navigation into a site.

**Results → navigation (stretch).** Minimum: keep the readout. Better: make a
result navigable (jump to that journey/floor) or highlight it on the world/travel
map. No existing highlight path exists, so this is optional polish flagged for
its own step.

---

## 4. Toggle-off implications

- 3A is itself a toggle-off improvement: the section becomes truly mod-owned.
- 3B (design system) is core-side and mod-agnostic — primitives name no mod.
- 3C: the detector is core UI, but its *target vocabulary* (hieroglyphs) comes
  from the registered fragment currency. With the mod off there are no
  partial-fragment slots → no target affordance → compass has nothing to hunt
  (consumable/hidden-passageway modes, owned by trap/core, are unaffected). The
  detector must degrade cleanly when the fragment currency isn't registered.

---

## 5. Open questions (DS-1/MOD-1 — mostly resolved)

> Q1/Q2 resolved by DS-1/MOD-1 (see §6). The detector questions Q3–Q5 are now
> superseded — folded into §8 (state home, reachability source, results) and the
> build-time open ends in §8.6.


- **Q1 — Section registry location & props surface.** Register in
  `src/app/pages/` (core owns the screen, mods contribute) vs `src/mods/`.
  Recommendation: registry type in `src/app/pages/`, aggregator in `src/mods/`
  (matches families: registry in `src/app/families/`, aggregator in `src/mods/`).
- **Q2 — How much state does a section get?** Pass the whole `useProgression` /
  `useInventory` (simple, but a section can touch anything) vs a narrow
  read-only props contract (stricter boundary, more plumbing). Recommendation:
  narrow contract — a section gets `{ selectedItem, onSelect, items,
  progressFor }`, nothing that lets it mutate core state.
- **Q3 — Detector state home.** App-level context vs persisted `compassTarget`.
  Persisting is simpler and lets the hunt survive reloads; context is lighter.
- **Q4 — Compass reachability source.** Reuse the world-gen reachability solver
  at runtime, or a lighter "owned ward keys + tier unlocked" check? The solver
  is authoritative but heavier to call per-render.
- **Q5 — Results presentation.** Text readout (current) vs navigable/highlighted.
  Affects scope of the compass slice.

---

## 6. Sequencing (two slices, each independently shippable)

1. **DS-1 — design-system primitives. ✅ DONE.** Added `CollectibleSlot`,
   `CollectionSection`, `CategoryGrid`, `difficultyColors` tokens + stories.
   Refactored `Collection.tsx`'s three sections onto them. `CategoryGrid` ended
   up auto-fitting fixed-width tiles with a gap-based density knob (the original
   fixed-column breakpoints were fragile). Also fixed the invisible-selection bug
   (clip-safe drop-shadow outline). No intended visual change to unselected tiles.
2. **MOD-1 — mod-owned hieroglyph section. ✅ DONE.** Added
   `collectionSectionRegistry.ts` + `registerAllCollectionSections.ts`
   (aggregator); moved the section into `mods/hieroglyph/app/`, gated on
   `isModEnabled`. Toggle-off proven: section gone + app builds + core Collection
   names no hieroglyph. A registered section gets only `{selectedItem, onSelect}`
   and self-sources its own hooks (the narrow contract, Q2).

Both shipped green with a toggle-off proof.

**DET-1 (detector revival) — now designed + planned, see §7 (design) and §8
(phases P1–P5).** No longer deferred. Depends on DS-1 + MOD-1 (both done).

---

## 7. Detector mechanic, perks & tomb-treasure collection (DET-1, authoritative)

One interlocking system: **tomb treasures** grant **perks**; some perks are **detector
levels**; the **Collection** shows treasures + their perk bonus. Ownership is split so
each mod owns its own gameplay and core names none of it.

### 7.1 The three detectors — different effects, different owners

The "detectors" are NOT one mechanic. Three distinct effects, do not conflate:

| detector | kind | owner | scanner/consumer | what the level does |
|---|---|---|---|---|
| **corridor** (`detection`) | passive reveal | **core** | `useAssembledFloor` masks/reveals `hidden` cells | reveal scope **widens outward** with level |
| **compass** (hieroglyph fragments) | active target mode | **hieroglyph** | `detectorScanners` (hieroglyph registers the scanner) | precision **narrows inward** with level |
| **supplies** (consumables) | active target mode | **trap** | `useDetector` reads skipped-consumable chests | precision **narrows inward** (same as compass) |

`max-health`/`armor`/`trap-insight`/`pack-mule` (trap) and `scribes-eye` (puzzle) are
the non-detector perks. Detection is the only detector core owns — because a hidden
corridor is core map structure; compass/supplies serve a mod's gameplay (fragments /
consumables) so they belong to that mod.

### 7.2 Tier semantics (the gameplay spec)

**Corridor detector — widens outward** (each level stacks on the lower; **4 levels** — matches
the authored `TREASURE_PERKS` grants L1–L4, decided 2026-07-16):
| L | reveal |
|---|---|
| L1 | **proximity** — notify + reveal when the player is *near* a hidden corridor (built today) |
| L2 | **floor** — indicator that a hidden corridor exists *somewhere on this floor* |
| L3 | **pyramid marker** — on the pyramid's own map: this pyramid has unexplored hidden corridors |
| L4 | **journey-list marker** — on the travel screen (broadest reach, for revisits across the world) |

**Compass (fragments) & supplies (consumables) — narrow inward** (higher = more precise):
| L | precision |
|---|---|
| L1 | which **pyramid** holds it |
| L2 | which **floor** |
| L3 | **exact** location |

The two active detectors share the inward-narrowing shape; the passive corridor detector
is the mirror (outward-widening). This directional contrast is the design's core idea.

### 7.3 Hidden corridor = a gated pathway (loot-placement model)

A hidden corridor gates its loot behind **discovery** (revealed by the corridor detector
*or* stumbled onto), NOT behind a key. So in the world-gen model a hidden path is a
**gated pathway** whose contents are an **optional loot pocket** (the §E sense — see
`keys-and-locks-solver.md`): always structurally reachable, but off the guaranteed path,
so only *optional* loot may sit there (never a progression-gating currency the solver
must guarantee). This makes the corridor detector a genuine loot-access perk, not just a
cosmetic reveal — its payoff is the optional pockets it surfaces.

### 7.4 Perk system — the unlock mechanism (revives §F)

Perks are granted by tomb treasures and consumed by the owning mod. Contribution-driven,
mirroring `rewardContributions`:

- **Seam:** `registerPerkContribution(() => ({ grant, describe }))` per mod. Merged
  `useMergedPerkContributions() → { grant, describe }`.
  - `grant(perk)` — applies to the mod's own state; no-ops for perks it doesn't own.
  - `describe(perk) → { label } | undefined` — translatable bonus text from the owning
    mod's i18n namespace (undefined for perks it doesn't own).
- **Payload:** open descriptor `{ type: string; level?: number }` (mods coin perk ids,
  same as the open `TreasureReward` rule). No shared union import.
- **Delete** the dormant `perkRegistry` + `registerPerks` (+ spec) — registered at boot
  but never read; each mod's contribution now owns its cap/bump logic.
- **Dispatch:** `tomb-treasure`'s `tombKey` reward effect resolves `TREASURE_PERKS[keyId]`
  and calls the merged `grant`. tier-unlock/location-key/`none` match no perk handler →
  no-op (handled by `addTombKey`/discovery); `tomb-treasure` `describe`s those lines itself.

**Perk state homes** (each perk lives with its owning gameplay — closes the last
§D-class core-state leak):

| home | perks |
|---|---|
| trap `useTrapProgress` | max-health, armor, trap-insight, pack-mule, **supplies-detector** |
| hieroglyph progress hook | **compass** |
| puzzle progress hook (new) | scribes-eye |
| core `useProgression.corePerks` (+ new perk setter) | **corridor-detector** |

The `DetectorPanel` (core UI) reads its three levels from a **merged detector-level
accessor** (`useMergedHeldKeys`-style: compass←hieroglyph, supplies←trap,
corridor←core) instead of one core `perks` blob.

### 7.5 Tomb-treasure collection — unify with perks

The 40 tomb-floor treasures already have two authored views of one object (a **1:1** map):
- catalog identity `tN` (`data/treasures.ts`: name/symbol/description, 5 per-difficulty
  groups), and
- perk `TREASURE_PERKS[keyId]`, where `keyId = <tier>_<a|b|c>_<floor>` →
  `journey.treasures[floor-1]`.

Both halves are currently dead (perks no-op; nothing writes `tN` to inventory so the
Collection treasure sections show all-empty). Unify:
- Claiming a tomb-floor `tombKey` → `addTombKey` + grant its perk. **"Collected" = own
  the keyId** (derived from `tombKeys`, no inventory `tN`).
- The 5 per-difficulty treasure sections **move** from core `Collection.tsx` into a
  **tomb-treasure Collection section** (mod-owned), rendering name/symbol/description +
  the perk bonus as `effectDescription` (via merged `describe`).
- **Retire** `tombTreasureSelection.ts` (old per-run random award) + the dead
  inventory-tracking. `data/treasures.ts` moves into the tomb-treasure mod; `journeys.ts`
  stops carrying `treasures:` per tomb (core→content coupling cut). Handle `Travel.tsx`'s
  `journey.treasures.length` disable-check.

### 7.6 Current state vs target (what's actually built)

- **Perks:** granted nowhere (`applyTreasurePerk` no-op). Effects mostly wired
  (`maxHealth` — note the duplicate: `useTrapProgress` holds a live fixed `6`, `useProgression`
  a dead copy; armor/detector levels read but stuck at 0). trap-insight + pack-mule have
  **no consumer** (effect unbuilt).
- **Detectors:** all tiered (§7.2 done). Compass + supplies narrow inward (P3); corridor
  widens outward (P4): L1 proximity, L2 floor line, L3 pyramid-wide count, L4 travel-list
  badge. Corridor "found" = noticed via proximity (no reveal/enter flow — that's P5).
- **Treasure collection:** dead (all-empty).

### 7.7 Toggle-off

- trap/puzzle/hieroglyph off → their perk contribution unregistered → `grant` no-ops,
  `describe` → undefined → Collection shows the treasure with no bonus line. Compass/
  supplies mode simply absent (no scanner/level source). World unaffected.
- The corridor detector (core) is always present; its payoff (hidden pockets) exists
  independent of any mod.

## 8. Build plan — locked decisions + concrete task list (multi-session)

This section is the **build-from spec**. Each phase is its own session/slice: commit per
boundary, self-verify (`tsc -b` + `vitest` + `lint` + `build` + `generate-world`; editor
diagnostics lag — trust the CLI), playtest, toggle-off proof, then push. P1 discharges
the §F audit item; P2 delivers the Collection ask; P3–P5 are new tiered gameplay + loot.

### 8.0 Locked decisions (resolved with the user — do NOT re-litigate)

- **Seam = contribution-driven** `registerPerkContribution(() => ({ grant, describe }))`,
  merged like `rewardContributions`. **Delete** `perkRegistry` + `registerPerks` + spec
  (dormant: registered at boot, never read).
- **Payload = open descriptor** `{ type: string; level?: number }`; each mod matches its
  own perk-id strings. No shared union. Boot/test **assertion**: every stat-perk type in
  `TREASURE_PERKS` has a registered `grant` (guards the silent-no-op typo risk).
- **Perk state homes** (§7.4 table): trap owns max-health/armor/trap-insight/pack-mule/
  supplies-detector; hieroglyph owns compass; puzzle owns scribes-eye; core owns
  corridor-detector only. Resolves the `maxHealth` duplication (trap's copy becomes the
  single source).
- **Detector ownership**: corridor=core, compass=hieroglyph, supplies=trap. `DetectorPanel`
  reads a **merged detector-level accessor**, not one core `perks` blob.
- **Treasure identity**: keyId `<tier>_<a|b|c>_<floor>` ↔ `tN` is **1:1**;
  `keyId → journey.treasures[floor-1]`. "Collected" = own the keyId (no inventory `tN`).
- **Tiers** (§7.2): built in P3/P4; until then detectors are enable-gated (level>0 = on).
- **Storage**: no version bump — dropped core perk slices are harmlessly ignored in old
  blobs; new mod-state fields default (`?? 0`); perks were all baseline (dead) so no data
  lost.
- **Out of scope of the whole plan**: re-authoring which treasure grants which perk (keep
  `TREASURE_PERKS` as-is); rebalancing the perk economy ("just never wired", not a redesign).

### 8.0.1 Perk catalog (rescued from `registerPerks` before it's deleted — the authority)

Each mod's `grant` reimplements its own bump (the helpers `increment(cap)`/`setOnce`/`toLevel`
die with `registerPerks`; the caps/effects below are what they encode). `bump`: `inc` =
`min(cap, cur+1)`, `set` = fixed value, `toLevel` = `max(cur, grantedLevel)`.

| perk | owner | field | cap | bump | effect (consumer) |
|---|---|---|---|---|---|
| max-health | trap | `maxHealth` | 12 | inc | health cap in **half-hearts** (base 6, +½♥ = +1); `HealthDisplay`/`TrapFamilyShell` |
| armor | trap | `armorStacks` | 2 | inc | reduces trap damage per stack (consumer exists) |
| trap-insight | trap | `trapInsightStacks` | 2 | inc | **orphan — build:** +1s/stack in `TRAP_TIME_LIMITS_SECONDS` |
| pack-mule | trap | `packMuleLevel` | 1 | set 1 | **orphan — build:** consumable carry cap `lvl===1 ? 4 : 2` |
| supplies-detector | trap | `consumableDetectorLevel` | 3 | toLevel | supplies detector (P3 tiers) |
| compass | hieroglyph | `compassLevel` | 3 | toLevel | fragment compass (P3 tiers) |
| corridor-detector | core | `detectionLevel` | 4 | toLevel | hidden-corridor reveal (P4 tiers; L1 built) |
| scribes-eye | puzzle | `scribesEyeLevel` | 3 | toLevel | tableau hint slots; `TombPuzzle`/`TombTableau` |

Non-perk `TREASURE_PERKS` types (`tier-unlock`/`location-key`/`none`) are NOT granted via the
seam — `addTombKey` + discovery handle them; tomb-treasure `describe`s their Collection line itself.

**i18n (decided):** no per-mod locale namespaces exist (flat `common/treasures/…`). Perk bonus
text goes in **`treasures.json` under `perks.<type>`** (replacing the stale `effects` block, which
is old vocab). Each mod's `describe` reads its own `perks.*` keys via `t(…, {ns:"treasures"})` —
shared namespace, mod-owned keys (same pattern as `sellables`). Off-mod keys sit unused (harmless;
`describe` isn't called when the mod's off).

### 8.1 P1 — perk-grant seam + revive (closes §F)

- **New** `src/app/SiteMap/perkContributions.ts`: `registerPerkContribution` + `useMergedPerkContributions() → { grant, describe }` (copy `rewardContributions.ts` shape/rules-of-hooks comment).
- **New** `src/app/SiteMap/detectorLevels.ts`: `useMergedDetectorLevels() → { compass, supplies, corridor }` sourcing each from its owning mod (registry seam like `keyProviders`).
- **trap** (`useTrapProgress.ts` + `app/index.ts`): add `armorStacks`/`trapInsightStacks`/`packMuleLevel`/`consumableDetectorLevel` to the mod state (maxHealth already there — make it the grant target); register a perk contribution granting/ describing those 5; contribute `supplies` level. Build orphans: **pack-mule** → carry cap `packMuleLevel===1 ? 4 : 2`; **trap-insight** → `+1s`/stack in `TRAP_TIME_LIMITS_SECONDS`.
- **hieroglyph**: add `compassLevel` to its progress hook; register a perk contribution (compass grant/describe); contribute `compass` level.
- **puzzle**: new progress hook with `scribesEyeLevel`; register perk contribution (scribes-eye); repoint `TombPuzzle.tsx:57` off `progression.perks`.
- **core** (`src/mods/core/app`): register a perk contribution for `corridor-detector` (detection); `useProgression` gains a core-perk setter; `corePerks` shrinks to `{ detectionLevel }`. Remove `trapPerks`/`puzzlePerks` slices + the merged `perks` blob’s trap/puzzle fields.
- **tomb-treasure** (`app/index.ts` + `useTombTreasureProgress.ts`): replace the no-op `applyTreasurePerk` — in the `tombKey` effect, resolve `TREASURE_PERKS[keyId]` and call merged `grant`. (`TREASURE_PERKS` still in `src/data` for P1; moves in P2.)
- **Delete**: `src/game/perks/perkRegistry.ts` (+spec), `src/app/state/registerPerks.ts`, its `main.tsx` import.
- **i18n**: perk `describe` strings per owning mod's namespace (the §14 text). `describe` built now even though its consumer (Collection) lands in P2.
- **SiteMapScreen**: feed `DetectorPanel` from `useMergedDetectorLevels()`.
- **Verify/playtest**: claim a max-health + a compass treasure → health cap rises, compass mode appears. Toggle-off: trap off → those perks no-op, world builds.

**P1 specifics (resolved — don't re-derive):**
- `useMergedPerkContributions`: **`grant`** calls *every* registered handler (each no-ops for
  perks it doesn't own — a perk has exactly one owner); **`describe`** returns the *first
  non-undefined* result. Same load-once/rules-of-hooks discipline as `rewardContributions.ts`.
- `describe(perk) → { label: string } | undefined`; `label` becomes the Collection item's
  `effectDescription` (P2). Grant runs during claim; describe during Collection render — both off
  the one merged hook.
- Detector-level seam (`detectorLevels.ts`): a tiny registry `registerDetectorLevel(mode,
  useLevel)` merged into `useMergedDetectorLevels() → { compass, supplies, corridor }`; each owner
  mod registers its own (core registers corridor). Core names no mod. `SiteMapScreen` feeds
  `DetectorPanel` from it (replaces the `progression.perks` reads).
- Boot **assertion** lives in a test (`perkContributions.spec.ts`): for every stat-perk `type` in
  `TREASURE_PERKS`, a handler is registered (with all mods on). Guards the open-payload typo risk.
- `useProgression`: delete `trapPerks`/`puzzlePerks` slices + `INITIAL_*`; `corePerks` = `{
  detectionLevel }`; add a setter (`bumpDetection(level)`), consumed by core's perk contribution.
  The merged `perks` blob for external readers shrinks to detection only (compass/supplies/health
  now read via their mods / the detector-level seam).

### 8.2 P2 — tomb-treasure Collection section

- Move `src/data/treasures.ts` → `src/mods/tombTreasure/game/` (catalog + keyId↔tN map). Cut `journeys.ts` `treasures:` per-tomb; derive tomb→treasures in the mod. Fix `Travel.tsx`'s `journey.treasures.length` disable-check (use mod data or a mod-exported count).
- Move `TREASURE_PERKS` → tomb-treasure mod. `buildSite.freeWardIndices` leak: inject a `reservedTreasureIndices(tombId)` from the mod via `generateWorld.ts` (stop `worldGen` reading perk types).
- **New** `src/mods/tombTreasure/app/TombTreasureCollectionSection.tsx`: 5 per-difficulty groups from the catalog; state collected iff keyId ∈ owned `tombKeys`; render name/symbol/description + perk bonus (`effectDescription` via merged `describe`); tier-unlock/location-key/none described by the mod itself. `registerCollectionSection` (order after hieroglyph/shop), gated on the mod.
- **Remove** the treasure sections from core `Collection.tsx`; **retire** `tombTreasureSelection.ts` + the dead inventory-`tN` path.
- **Verify**: complete a tomb → its treasure shows collected + bonus in Collection. Toggle-off: tomb-treasure off → section gone, world builds.

**P2 specifics (resolved — don't re-derive):**
- **keyId → tN** function (put in the mod): parse `keyId = <tier>_<slot>_<floor>` (slot ∈ a/b/c);
  tombId = `<tier>_treasure_tomb` + (`slot==="a" ? "" : "_"+slot`); then that tomb's ordered
  treasure list (`merchantCache`/… — the per-tomb arrays) indexed at `floor-1`. Confirmed 1:1 for
  all 40. keyId format is the same string used in the `tombKey` reward (`{keyId:"junior_a_1"}`).
- **Collected** = `tombKeys.has(keyId)` (derived; no inventory `tN`, no new state).
- **Travel.tsx disable**: the current `journey.treasures.length <= completionCount` is already
  dead under persistent tombs (length 4–12, completionCount caps at 1) → **drop it** (tombs are
  always re-enterable). Don't reintroduce a treasures-count dependency.
- **`buildSite.freeWardIndices` leak**: inject `reservedTreasureIndices(tombId): number[]` from
  tomb-treasure via `generateWorld.ts` → `buildConfigs` (same seam as `resolveTombReward`/
  `shopStock`); it returns the floor indices that are tier-unlock/location-key (spoken for), so
  `worldGen` stops importing `TREASURE_PERKS`/reading perk types.
- Keep `data/treasures.ts` **content** intact when moving it into the mod (names/symbols/descriptions
  are authored, in `treasures.json` too) — this is a move, not a rewrite.

### 8.3 P3 — tiered active detectors (compass + supplies) · NEW GAMEPLAY

- Make the compass scanner (`mods/hieroglyph/app/compassScanner.ts`) and the supplies
  results (`useDetector`) **level-aware** per §7.2 (narrow inward): L1 → pyramid (`journeyId`
  only), L2 → +floor, L3 → exact cell. Thread the owning mod's level into the scanner.
- `DetectorPanel` renders precision by level (hide floor/cell at low levels).
- **Verify**: L1 shows pyramid only; L3 shows exact. Playtest each level.

### 8.4 P4 — tiered corridor detector · NEW GAMEPLAY + travel-map UI

- Corridor detector per §7.2 (widen outward): L1 proximity (exists) → L2 floor-level "a
  hidden corridor exists on this floor" indicator → L3 journey-map marker for revisits
  (new travel/journey-map surface).
- Touches `useAssembledFloor` (already reveals at L1), `DetectorPanel`, and the journey/
  travel map (L3 marker). Persist "pyramid has unexplored hidden corridors" per journey.
- **Verify**: L2 floor indicator; L3 marker appears on the travel map, clears when all
  hidden corridors on that pyramid are found.

### 8.5 P5 — hidden corridor = gated pathway (world-gen loot) · touches §E/economy

- Model `hidden` paths as **optional-pocket gated pathways** (§7.3) in the placement/
  reachability solver: their slots are optional-reachable, never hold a progression-gating
  currency. Align with the §E "every treasure gates an optional pocket" machinery.
- **Verify**: `generate-world` economy + reachability guards still pass; a hidden pocket
  never holds a required fragment/mapPiece; regen diff reviewed.

### 8.6 Open ends to resolve at build time (not blockers now)

- ~~P3: does the hieroglyph compass ranking need proximity (player position) for L2/L3, or
  just scope-narrowing?~~ **RESOLVED (P3, 2026-07-16): scope-narrowing only, no proximity.**
  The scanner runs over the static `generatedWorldConfigs` (no live player position; the compass
  is a global hunt across all pyramids, not a current-floor radar). §7.2's inward-narrowing ladder
  IS the mechanic; "locks onto nearest" (§3C) is dropped — disproportionate plumbing (player cell +
  distance) for a 3-line HUD readout.
- ~~P3: exact-cell for compass~~ **RESOLVED (P3, 2026-07-16, user sign-off): built now.** Static
  config has no grid cells (cells only exist post-assembly). Reproduced without live journey state:
  a persistent interior's seed is a pure function of its id (`generateNewSeed(hashString(journeyId),
  1)`; every generatedWorld journey is a persistent interior — `journeys.ts` assigns `siteConfigs`),
  so `floorSeed = idSeed + (levelIdx+1) + floorIdx` (mirrors `SiteMapScreen`). At L3 only, the
  scanner assembles each floor holding an uncollected piece and finds the fragment's cell (scans
  `reward` + shop `stock`); a failed assembly degrades to floor-level (cell omitted), never drops
  the hit. Supplies gets the cell for free (`edgeId` decodes to `floor:row,col`). Precision +
  per-level dedup live in `DetectorPanel` (scanner owns data-cost, panel owns presentation).
- ~~P3 GAP (surfaced, not yet closed): the compass **target picker is still empty** in production
  (`SiteMapScreen availableHieroglyphs={[]}`).~~ **RESOLVED (UI-slice, 2026-07-16): target-picking
  moved to the Collection (§3C), the dead HUD `<select>` deleted.** The hunt affordance is a **hunt
  bar** in the mod-owned `HieroglyphCollectionSection` (gated on `compassLevel > 0`): selecting an
  uncollected hieroglyph offers "Hunt <symbol>"; the active target shows with a Stop button. The
  `DetectorPanel` compass panel is now read-only — it shows the readout for the picked target, or
  "Pick a hieroglyph to hunt in your Collection" when none. `availableHieroglyphs` +
  `onSetCompassTarget` props and the `<select>` are gone. See the state-home decision in the last
  §8.6 bullet.
- ~~P4: journey-map marker surface — reuse an existing travel-map badge or new component?~~
  **RESOLVED (P4, 2026-07-16): reuse the `JourneyCard` badge cluster** (the existing 📜 map-piece /
  ✔ completion row). L4 adds one `👁` badge there, gated on `hasUnexploredCorridors`. No new
  component — the cluster is exactly the "per-pyramid status glyphs on the travel list" surface.
- ~~P4: what counts as a corridor "found" (the marker clear-signal)?~~ **RESOLVED (P4, 2026-07-16,
  user sign-off): found = noticed via proximity.** Standing on a detector-forced hidden junction
  (the `stoppedAtHidden` moment from the HiddenPassage story) marks the corridor it borders found —
  no reveal/enter flow. P4 is pure awareness UI; actual loot access stays a P5 concern. Persisted
  per journey as `known` (floors viewed) + `found` (junctions reached); outstanding = known \ found.
  **Limitation (accepted):** markers only nag about corridors on floors the player has *viewed* —
  you can't be reminded of what you've never walked onto. Coherent with the awareness framing.
- ~~P4: 3 levels or 4?~~ **RESOLVED (P4, 2026-07-16): 4, per the frozen §7.2 + cap-4 catalog.** The
  §8.4/kickoff "3-item" phrasing merged §7.2's L3 (pyramid-own-map) and L4 (travel list); the frozen
  spec wins. Built L1 proximity → L2 floor line → L3 pyramid-wide count (both in `DetectorPanel`,
  inside the site) → L4 `JourneyCard` badge (travel list). L3 and L4 share the outstanding-count
  read; they differ only in surface.
- ~~P5: are today's `hidden` sections already reachability-gated, or placed as normal
  reachable?~~ **RESOLVED (P5, 2026-07-16): placed as NORMAL reachable — the bug.** `buildSite`
  flags `hidden:true` on the SECTION, and the assembler tags the cells `hidden` + keeps the
  connector to the visible attachment point visible, but the section carries **no key gate**. The
  world-gen reachability solver (`reachability.ts`) walks raw `assembleFloor`/`collectReachableKeys`
  (masking is a runtime-only concern in `useAssembledFloor.maskHiddenCells`, never applied at
  gen), so hidden rooms are fully reachable to it and `collectSlots` didn't distinguish them → the
  gating worklist placed **31 required hieroglyph fragments in hidden pockets**. Fix: mark slots
  `hidden` and exclude them from the gating worklist (`placeFragments`), keeping them for optional
  filler only, + a `validate.ts` backstop. Hidden pockets are stricter than §E ward pockets: a ward
  pocket may become load-bearing once its key is placed (reachability-guaranteed), but a hidden
  pocket is **discovery-gated** (no key currency, reveal never guaranteed) so it may NEVER be
  load-bearing. Regen: 294/294 fragments still placed (31 relocated to visible slots), world solvable.
- ~~**P5 GAP: no in-game reveal/enter flow for hidden corridors.**~~ **RESOLVED (2026-07-16):
  wired into `SiteMapScreen`.** The reveal reuses P4's found-via-proximity mechanic rather than
  lifting the story's separate button/state: the persisted `foundHiddenCorridors` set (corridors
  whose bordering junction the player has reached, detector ≥ L1) is fed into `useAssembledFloor`
  as `revealedSections`. So reaching a junction both *notices* (P4 marker) AND *reveals* (unmasks)
  the corridor it borders — its cells become walkable and its optional loot collectible via the
  normal encounter flow. **found = revealed** now (the two collapse to one moment, by design —
  §7.3 "revealed by the corridor detector *or* stumbled onto"; without a detector the player still
  glides through unaware). No new state/effect: the P4 junction→section map + persistence already
  do the work; only the wiring (one derived `revealedSections`, keyed on a stable content string
  so the mask memo + found-marking effect don't churn) was missing. `HiddenPassage.stories.tsx`'s
  explicit reveal *button* stays story-only (a manual-playtest affordance); production reveal is
  automatic on junction-reach. Proven at the render layer (`useAssembledFloor.spec`: a section in
  `revealedSections` un-masks → cells reappear, drops from `hiddenSectionHashes` → walkable).
- ~~Detector state persistence (`compassTarget`) — ephemeral today (§3C Q3); persist if the
  hunt should survive navigation (relevant once P3 lands).~~ **RESOLVED (UI-slice, 2026-07-16):
  `compassTarget` lives in the hieroglyph mod's own persisted state** (`useModState("hieroglyph")`,
  next to `compassLevel`), NOT app-context. Rationale: the target is a hieroglyph id — meaningless
  without the mod — so mod-owned state gives the cleanest toggle-off (it drops with the mod, core
  names nothing), persists across navigation into a site AND across reloads (Q3 "persisting is
  simpler"), and lets the mod-owned Collection picker write it directly with no extra plumbing. Core
  reads it via a new read-only seam `src/app/SiteMap/compassTarget.ts` (`registerCompassTarget` /
  `useCompassTarget`, mirroring `detectorLevels.ts`); `useDetector` reads the seam instead of holding
  its own `useState`, so a target picked on Collection drives the in-run `DetectorPanel` readout.
  Write path = Collection only (the mod's hook); core no longer sets the target (`setCompassTarget`
  dropped from `DetectorAPI`).

## 9. Handover protocol (every building session follows this)

The point: a session picks up a phase and executes it **without a pile of questions or
silent guesses**. This doc is the single source; keep it that way.

**Before building a phase:**
1. Read §7 (design), §8.0 + §8.0.1 (locked decisions + perk catalog), and that phase's §8.x
   task block. That is the full brief — you should not need to reverse-engineer intent.
2. Treat §8.0/§8.0.1 as **frozen**. Reopen a locked decision only with explicit user sign-off;
   if reopened, edit the locked entry and note it in the progress log below.

**While building:**
3. Commit per boundary. Self-verify with the **CLI** (`tsc -b`, `vitest`, `lint`, `build`,
   `generate-world`) — editor diagnostics lag on renames/moves, don't trust them.
4. Playtest the phase's acceptance + prove toggle-off. Push when green.

**The no-silent-guess rule (this is what keeps handovers clean):**
5. If you hit something the task block didn't specify, do NOT guess silently. Either ask the
   user, or make the call and **write it into this doc** as a resolved decision (with one-line
   rationale) — so the next session sees a decision, not a mystery. A gap you had to fill is a
   doc bug; fixing the doc is part of the work.
6. Any NEW open question you surface but don't resolve → add it to §8.6 so it isn't lost.

**On handover (end of session):**
7. Append an entry to the §9.1 log — phase, status, commit hashes, what's built, what remains
   next, any decision/gap you recorded. Keep it terse; detail lives in the decisions above.
8. **Emit the next kickoff prompt** (§9.2 template) for whatever comes next — the rest of this
   phase if partial, or the next phase if done — then tell the user: **"Phase done + pushed —
   clear the context and start a fresh session with the prompt above."** The chain runs one
   phase (or phase-slice) per fresh context; a session never silently rolls into the next phase.

### 9.2 Kickoff prompt template (paste into a fresh session)

Fill `<PHASE>` (e.g. `P1`) and, if resuming a partial phase, a one-line `<RESUME NOTE>`:

```
Continue the detector+perk+treasure revive on branch mods/hieroglyph-currency.
Read docs/mods/collection-and-detector-design.md — §7 (design), §8.0 + §8.0.1
(locked decisions + perk catalog, FROZEN), §8.<PHASE> (your task list), and §9
(handover protocol). Check §9.1 for the latest progress. <RESUME NOTE>

Build <PHASE> only. Follow §9: commit per boundary; self-verify with the CLI
(tsc -b / vitest / lint / build / generate-world — editor diagnostics lag);
playtest the phase acceptance; prove toggle-off; push. No silent guesses — if the
task block didn't cover something, ask or record the decision in the doc. When
done: update the §9.1 log and emit the next kickoff prompt.
```

### 9.1 Progress log

_(none yet — P1 is the next pickup. First builder: start a bullet here.)_

- **Prep (2026-07-16)** — design (§7) + build plan (§8) + handover protocol (§9) written; no
  code yet. Locked decisions in §8.0/§8.0.1. Corridor detector confirmed **4 levels**. Next: P1.
- **P1 DONE + pushed (2026-07-16)** — perk-grant seam + revive complete. Commits `6207c55`
  (seams), `9d90b72` (trap perks + orphans), `7f86c69` (hieroglyph/puzzle perks), `92ba5f1`
  (dispatch + core shrink + deletes + i18n + boot assertion) on `mods/hieroglyph-currency`.
  Built: `perkContributions.ts` (grant fans out, describe first-owner) + `detectorLevels.ts`
  (merged compass/supplies/corridor). Perk state moved to owning mods — trap owns
  max-health/armor/trap-insight/pack-mule/consumable-detector (maxHealth now the single
  stateful source, dup resolved), hieroglyph owns compass, puzzle owns scribes-eye (new
  `usePuzzleProgress`), core owns detection only (`bumpDetection`). Orphans built: pack-mule
  carry cap 2→4, trap-insight +1s/stack. tomb-treasure `tombKey` claim dispatches
  `TREASURE_PERKS[keyId]` → merged grant. Deleted `perkRegistry`(+spec)/`registerPerks` +
  main.tsx import. `DetectorPanel` fed from the merged detector-level accessor. CLI all green
  (tsc, 719 tests, lint, build, generate-world regen identical). Toggle-off proven: trap out of
  `REGISTERED_MODS` (+import) → tsc/build/generate-world green, consumables dropped, perk seam
  no-ops. **Decisions recorded** (were doc gaps): (1) perk-id strings follow authored
  `treasurePerks.ts` — the supplies detector's perk id is **`consumable-detector`** (field
  `consumableDetectorLevel`, detector mode `"supplies"`), NOT `supplies-detector` as the §8.0.1
  name column suggests. (2) **trap-insight extends only already-timed traps** (base>0); untimed
  starter/junior (base 0) stay untimed — 0 = no countdown. (3) Perk `describe` label text
  authored in `treasures.json` `perks.<type>` (en+nl); consumable-detector/compass/detection/
  scribes-eye interpolate `{{level}}`. (4) Boot assertion implemented as **describe-coverage**
  (a defined `describe(perk)` ⇒ the perk has an owning mod), all-mods-on. (5) **Playtest** was
  done as automated grant-path tests (`useTrapProgress.perks.spec`: cap 6→7, carry 2→4, supplies
  toLevel; `useProgression.perks.spec`: bumpDetection toLevel/cap; coverage spec) — the UI
  claim-a-treasure flow isn't runnable headless in this harness, so the effect-turns-on
  acceptance is proven at the state layer instead. Next: **P2** (tomb-treasure Collection section).
- **P2 DONE + pushed (2026-07-16)** — tomb-treasure Collection section + data move complete.
  Commits `7fa305d` (reservedTreasureIndices seam), `21cfecd` (catalog + TREASURE_PERKS move),
  `944885c` (mod Collection section) on `mods/hieroglyph-currency`. Built: mod-owned
  `TombTreasureCollectionSection` (5 per-difficulty groups, "collected" = own the tombKey, perk
  bonus via merged `describe`), registered `order:30` gated on the mod; core `Collection.tsx`
  names no treasure. worldGen stops reading perk types (`reservedTreasureIndices` seam). CLI all
  green (tsc, 722 tests, lint, build, generate-world regen **identical**).
  **Decisions recorded** (were doc gaps):
  (1) **`src/data/treasures.ts` split, not a wholesale move**: the mod-agnostic material-tier
  naming (`MaterialTier`/`materialTierByDifficulty`/`difficultyByMaterialTier`) stays in core as
  `src/data/materialTiers.ts` (shop consumes it); only the treasure CATALOG moved to
  `src/mods/tombTreasure/game/treasures.ts`. Moving the whole file would create a shop→tombTreasure
  mod-to-mod import (boundary violation).
  (2) **Only `TREASURE_PERKS` moved to the mod**; `TOMB_PERK_IDS`/`TIER_UNLOCK_PERK_ID` stay in core
  `src/data/treasurePerks.ts` — they're structural keyId ordering world-gen wires ward gates from
  (identifiers, not gameplay meaning), imported by rewards/sideSections/buildSite/validateWorldSpec.
  (3) **The task's "generateWorld.ts" = `scripts/generateWorld.ts` → `buildConfigs`**. The
  `reservedTreasureIndices(tombId)` seam is threaded descriptor → registeredMods
  (`MOD_RESERVED_TREASURE_INDICES`) → `buildConfigs` → `buildSiteConfigs` → `buildSite` ctx;
  `freeWardIndices` now takes a `reserved` index set instead of reading perk types. Regen identical.
  (4) **Section always renders all 5 groups** (uncollected = empty `?` slot), dropping the old
  per-tomb `hasCompletedTomb` visibility gate — matches the hieroglyph/shop sections and the same
  persistent-tomb reasoning that dropped Travel's disable-check. `CollectionItem` gained an optional
  `difficulty` so the shared detail panel shows a treasure's pill/material without core resolving
  mod content (core `getItemFirstLevel` now resolves only tableau symbols).
  (5) **Dead code retired by the move**: `game/tombTreasureSelection.ts` (old per-run award),
  `app/translations/useTreasureTranslations.ts`, the story-only `HieroglyphUnlockPanel`(+story), and
  `TombTreasures.stories.tsx` (story of the retired per-run selection). `comparePuzzles.spec.ts`
  repointed its per-tomb run count from `journey.treasures` to `TOMB_PERK_IDS` (same counts).
  `JourneyCard.stories` dropped its `treasures:` mock.
  (6) **i18n**: `perks.tier-unlock` ("Unlocks {{tier}} tombs") + `perks.location-key` ("Reveals
  another tomb") added to `treasures.json` (en+nl); `none` = blank line; described by the mod itself.
  (7) **Toggle-off**: tomb-treasure removed from `REGISTERED_MODS` (+app import) → section gone +
  `yarn build` green. `yarn generate-world`'s full-solve still needs the mod (no currency owns the
  tomb ward keys) — the **pre-existing, documented** "last mod" isolation limit (see the descriptor
  comment), unchanged by P2. The P2 "world builds" gate is the app build. Next: **P3** (tiered active
  detectors — compass + supplies).
- **P3 DONE + pushed (2026-07-16)** — tiered active detectors (compass + supplies), narrow-inward
  precision (§7.2). Commits `ae08ab4` (level-aware scanners + types), `6fe598e` (panel precision),
  + this doc commit on `mods/hieroglyph-currency`. Built: `CompassResult` gained optional `cell`,
  `ConsumableResult` gained `floorIdx`+`cell` (decoded from `edgeId`). `compassScanner` reads its own
  `compassLevel`; at L3 only it assembles each floor holding an uncollected piece (seed reproduced
  purely from journeyId — persistent-interior seed is id-only) and resolves the fragment's exact cell
  (`reward` + shop `stock`), degrading to floor-level on assembly failure. `useDetector` decodes the
  supplies `edgeId` to floor+cell. `DetectorPanel` renders precision by level and dedups to the shown
  granularity (L1 one line per pyramid, L2 +floor, L3 +cell) — scanner owns data-cost, panel owns
  presentation. CLI all green (tsc, lint, **728** tests, build, generate-world regen **identical** —
  P3 touches no world-gen). Toggle-off proven: hieroglyph out of `REGISTERED_MODS` (+import) →
  tsc/build green; compass scanner + `detectorLevel("compass")` are inside `isModEnabled("hieroglyph")`
  (`hieroglyph/app/index.ts:22`) → compass level 0 → no compass button (mode absent). Supplies
  (trap-owned) + corridor (core) unaffected.
  **Decisions recorded** (§8.6): (1) **proximity = NO**, scope-narrowing only (scanner has no live
  player position; global hunt not a radar). (2) **compass exact-cell built now** (user sign-off) via
  pure-id floor-seed reproduction + L3-only assembly; supplies cell is free from `edgeId`. (3) dedup +
  precision live in the panel, not the scanner (scanner only gates the L3 assembly cost).
  **Playtest**: acceptance ("L1 pyramid only … L3 exact cell") proven by `DetectorPanel.spec` (render
  per level) + `compassScanner.spec` (no cell < L3, cell at L3) — the UI compass can't be driven
  headless because its target picker is still `availableHieroglyphs={[]}` (target-picking-on-Collection
  is a separate unbuilt slice; **new gap logged in §8.6**). Next: **P4** (tiered corridor detector +
  travel-map marker).
- **P4 DONE + pushed (2026-07-16)** — tiered corridor detector (widen outward, §7.2), core-owned.
  Commits `c66f2df` (persistence + junction→section map), `6a0daff` (in-game L1–L3), `41ebfb1` (L4
  travel badge), `2825d68` (lint), `b511343` (hook test) on `mods/hieroglyph-currency`. Built:
  **found = noticed via proximity** (user-chosen — no reveal/enter flow). `useJourneys` persists
  `knownHiddenCorridors` (floors viewed) + `foundHiddenCorridors` (junctions the detector stopped the
  player at), both keyed `levelNr:sectionHash`; outstanding = known \ found. `maskHiddenCells` now
  maps each hidden junction to the section hash it borders (`junctionSections`) so a proximity stop
  marks exactly that corridor. `SiteMapScreen` registers known corridors on floor view + marks found
  when `explorerPos` lands on a junction (detector ≥ L1). `DetectorPanel` widens outward: L1 proximity
  line, L2 "corridor waits on this floor", L3 pyramid-wide outstanding count. `JourneyCard` gains a
  `👁` badge (L4, reusing the map-piece/completion cluster) when detection ≥ 4 and the pyramid has
  outstanding corridors — clears when all noticed. CLI all green (tsc, lint, **731** tests +3 new,
  build, generate-world regen **identical** — P4 touches no world-gen). Toggle-off proven: trap +
  hieroglyph (supplies + compass owners) out of `REGISTERED_MODS` → tsc/build green + generate-world
  wrote; corridor detector (core: `useProgression` + `useJourneys`) unaffected, degrades cleanly.
  **Decisions recorded in §8.6** (were doc gaps/conflicts): (1) found = noticed-via-proximity, not
  revealed (user sign-off) — awareness only, loot access is P5; markers only cover *viewed* floors
  (accepted limitation). (2) 4 levels per frozen §7.2 (kickoff's "3-item" phrasing merged L3+L4). (3)
  L4 marker reuses the `JourneyCard` badge cluster, no new component. **Playtest**: acceptance proven
  at the state/render layer (`DetectorPanel.spec`: L1 silent / L2 floor / L3 count; `useJourneys.spec`:
  outstanding clears at 0; `useAssembledFloor.spec`: junction→section mapping) — the full navigate-to-
  a-junction UI flow isn't runnable headless in this harness, same constraint as P1/P3. Next: **P5**
  (hidden corridor = gated pathway / world-gen loot).

- **P5 DONE + pushed (2026-07-16)** — hidden corridor = optional-pocket gated pathway (§7.3),
  core world-gen. Commit `92f37b3` + this doc commit on `mods/hieroglyph-currency`. **Finding
  (resolved the §8.6 open end):** today's `hidden` sections were placed as **normal reachable** —
  the section carries no key gate, and the world-gen reachability solver walks raw
  `assembleFloor` (masking is runtime-only in `useAssembledFloor`), so 31 required hieroglyph
  fragments had been placed in hidden pockets a player can't guarantee reaching. Built: `slots.ts`
  marks each end/puzzle slot `hidden` (propagated to descendants of a hidden section);
  `placeFragments` excludes hidden end slots from the gating worklist (they stay eligible for the
  capped/dynamic filler passes — optional loot only); `validate.ts` post-build guard throws if any
  hidden pocket holds a map piece or registered gating currency (+3 specs). Hidden pockets are
  **stricter than §E ward pockets**: a ward pocket can become load-bearing once its key is placed
  (reachability-guaranteed), but a hidden pocket is discovery-gated (reveal never guaranteed) so it
  may never be load-bearing. CLI all green (tsc, lint, **734** tests +3, build, generate-world:
  294/294 fragments still placed — 31 relocated to visible slots — 31 map pieces, world fully
  solvable; golden guard + determinism pass). Regen diff symmetric (134 fragment lines out/in, no
  loss). Toggle-off proven: hieroglyph out of `REGISTERED_MODS` → generate-world green (0 fragments,
  gates degrade with their mod, no winnability hard-fail, guard doesn't trip). **Playtest**: the
  no-hidden-gating invariant proven at the data layer (`validate.spec`: throws on hidden
  fragment/map-piece, passes on hidden sellable; regen scan: 0 hidden pockets hold gating). **New
  gap logged in §8.6**: no in-game reveal/enter flow (only in `HiddenPassage.stories`), so the
  corridor detector's loot payoff isn't player-reachable yet — a separate unbuilt UI slice. **Next:
  P5 is the last planned phase.** The detector+perk+treasure revive (§8 P1–P5) is complete; the two
  open UI slices remaining across the plan (compass target-picker wiring, hidden-corridor reveal/
  enter flow) are logged in §8.6 as gaps, not phases.

- **UI-slice: hidden-corridor reveal/enter flow DONE + pushed (2026-07-16)** — closes the P5 GAP
  (§8.6). Commit `8a25e46` on `mods/hieroglyph-currency`. `SiteMapScreen` now derives
  `revealedSections` from the persisted `foundHiddenCorridors` set and feeds it to
  `useAssembledFloor`, so reaching a hidden corridor's bordering junction (detector ≥ L1) both marks
  it found (P4) and unmasks it — walkable + optional loot collectible via the normal encounter flow.
  **found = revealed** (one moment, by design). Reused P4's junction→section map + per-journey
  persistence wholesale — no new state, no new effect, ~12 LOC of wiring keyed on a stable content
  string (mask memo + found-marking effect must not churn). The story's reveal *button* stays
  story-only. CLI all green (tsc --force, lint, **735** tests +1 new, build; no world-gen touched so
  generate-world skipped). Toggle-off proven: hieroglyph + trap out of `REGISTERED_MODS` (+imports) →
  tsc + build green — the reveal flow is pure core (`SiteMapScreen` + `useAssembledFloor`, zero mod
  coupling), degrades cleanly. **Decision recorded in §8.6**: reveal is automatic on junction-reach
  (reuses P4's proximity trigger), not a separate button — found and revealed collapse to one moment,
  matching §7.3. **Playtest**: reveal→walkable proven at the render layer (`useAssembledFloor.spec`
  new case: revealed section un-masks, cells reappear, drops from `hiddenSectionHashes`) — the full
  navigate-to-a-junction UI flow isn't runnable headless, same harness constraint as P1/P3/P4; the
  `HiddenPassage` WithDetector story is the manual-playtest surface. **Next: the last open UI slice —
  the compass target-picker gap** (`SiteMapScreen availableHieroglyphs={[]}`, §8.6). Kickoff below.

- **UI-slice: compass target-picker DONE + pushed (2026-07-16)** — the LAST open UI slice in the
  plan; the detector+perk+treasure revive (§8 P1–P5 + both §8.6 UI gaps) is now fully complete.
  Commit `<pending>` on `mods/hieroglyph-currency`. Closes the P3 GAP (§8.6): the compass is now
  driveable end-to-end through the real UI. **State home (recorded in §8.6):** `compassTarget` lives
  in the hieroglyph mod's persisted state (`useModState`), not app-context — cleanest toggle-off +
  survives navigation/reload + the mod-owned picker writes it directly. Built: new read-only seam
  `src/app/SiteMap/compassTarget.ts` (`registerCompassTarget`/`useCompassTarget`, mirrors
  `detectorLevels.ts`); hieroglyph state gained `compassTarget` + `setCompassTarget`, registered on
  the seam. `useDetector` reads the seam (dropped its `useState` + `setCompassTarget` from
  `DetectorAPI`). **Picker = a hunt bar** in the mod-owned `HieroglyphCollectionSection` (gated
  `compassLevel > 0`): pick an uncollected hieroglyph → "Hunt <symbol>"; active target shows +
  Stop. The dead HUD `<select>` + `availableHieroglyphs`/`onSetCompassTarget` props deleted;
  `DetectorPanel` compass panel is now a read-only readout (or "Pick a hieroglyph … in your
  Collection" when no target). CLI all green (tsc --force, lint, **737** tests +2 net, build; no
  world-gen surface so generate-world skipped). Toggle-off proven: hieroglyph out of
  `REGISTERED_MODS` (+both imports) → tsc + build green — no fragment section (no hunt bar),
  `useCompassTarget` → null, compass detector level 0 (button absent); the seam degrades cleanly and
  core names no mod. **Playtest**: pick-target→persist proven at the state layer
  (`useHieroglyphProgress.compass.spec` round-trips + clears); readout precision + the no-target hint
  proven at the render layer (`DetectorPanel.spec`) — the full Collection-pick→enter-site→readout nav
  flow isn't runnable headless (same harness constraint as P1/P3/P4/P5). **Next: nothing — the plan
  is complete.** Both §8.6 UI gaps are closed; remaining doc items are the non-UI fidelity threads
  (§A, §G/§H) tracked in the audit, outside this plan.

### 9.3 Next kickoff — none, the plan is complete

The detector+perk+treasure revive (§8 P1–P5) plus both §8.6 UI slices (hidden-corridor reveal/enter
flow, compass target-picker) are all DONE + pushed on `mods/hieroglyph-currency`. There is no next
phase to kick off. Remaining threads live outside this plan: the non-UI fidelity items (§A mechanics-
in-core / legacy render / encounters-as-distributions, §G/§H) tracked in `docs/mods/FIDELITY-AUDIT.md`.

## Appendix A — (historical) why the detector was deferred during DS-1/MOD-1

**Resolved — now picked up in §7/§8.** During DS-1/MOD-1 the detector was deferred:
functionally dead (`availableHieroglyphs={[]}`), endgame-gated, and the
largest/riskiest concern (shared-state hoisting + counter-native reachability-aware
provider search + reward→cell→explored plumbing), fully independent of the section
work — so deferring de-risked DS-1/MOD-1 at zero coupling cost. It's now designed
(§7) and phased (§8).

The one constraint it left on DS-1/MOD-1 still holds: the Collection UI must
**degrade cleanly when a perk's mod isn't registered** — no dangling hunt
affordance, no assumption a detector exists. §7.7 carries this forward.
