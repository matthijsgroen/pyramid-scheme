# Design — mod-owned Collection sections, design-system extraction, detector revival

Three interlocking pieces: mod-owned **Collection sections** (§3), the **design-system
layer** they build on (§3B), and the **detector + perk + tomb-treasure** system (§7,
authoritative). Perks are the _unlock_ for the detectors, tomb treasures are where
they're granted, and the Collection is where they're shown — one system.

---

## 1. Why

Slice 2 gated the hieroglyph Collection section with
`getCurrencyMeta("fragment")?.showInCollection` in `Collection.tsx`. That
_hides_ the section when the mod's off — but the section's components still live
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
families). If we later want the descriptor to _declare_ its sections, that's the
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
export const difficultyMaterial: Record<Difficulty, MaterialSpec> // stone→emerald gradients + symbol color
export const difficultyRank: Record<Difficulty, string> // green→purple pill classes
```

`HieroglyphTile` consumes `difficultyMaterial` (collapsing its 3× inline
ternaries into one lookup); `hieroglyphLevelColors.ts` becomes a thin re-export
or is replaced at its two call sites; `DifficultyPill` consumes `difficultyRank`.
No visual change — pure de-duplication.

**Blast radius:** `HieroglyphTile` is shared by treasures + sellables, so the
material-token refactor touches all three collectible kinds. That's desirable
(single source) but means the DS slice must re-verify treasure/junk rendering,
not just hieroglyphs.

## 4. Toggle-off implications

- 3A is itself a toggle-off improvement: the section becomes truly mod-owned.
- 3B (design system) is core-side and mod-agnostic — primitives name no mod.
- The detector is core UI, but its _target vocabulary_ (hieroglyphs) comes
  from the registered fragment currency. With the mod off there are no
  partial-fragment slots → no target affordance → compass has nothing to hunt
  (consumable/hidden-passageway modes, owned by trap/core, are unaffected). The
  detector must degrade cleanly when the fragment currency isn't registered.

---

## 7. Detector mechanic, perks & tomb-treasure collection (DET-1, authoritative)

One interlocking system: **tomb treasures** grant **perks**; some perks are **detector
levels**; the **Collection** shows treasures + their perk bonus. Ownership is split so
each mod owns its own gameplay and core names none of it.

### 7.1 The three detectors — different effects, different owners

The "detectors" are NOT one mechanic. Three distinct effects, do not conflate:

| detector                           | kind               | owner          | scanner/consumer                                      | what the level does                            |
| ---------------------------------- | ------------------ | -------------- | ----------------------------------------------------- | ---------------------------------------------- |
| **corridor** (`detection`)         | passive reveal     | **core**       | `useAssembledFloor` masks/reveals `hidden` cells      | reveal scope **widens outward** with level     |
| **compass** (hieroglyph fragments) | active target mode | **hieroglyph** | `detectorScanners` (hieroglyph registers the scanner) | precision **narrows inward** with level        |
| **supplies** (consumables)         | active target mode | **trap**       | `useDetector` reads skipped-consumable chests         | precision **narrows inward** (same as compass) |

`max-health`/`armor`/`trap-insight`/`pack-mule` (trap) and `scribes-eye` (puzzle) are
the non-detector perks. Detection is the only detector core owns — because a hidden
corridor is core map structure; compass/supplies serve a mod's gameplay (fragments /
consumables) so they belong to that mod.

### 7.2 Tier semantics (the gameplay spec)

**Corridor detector — widens outward** (each level stacks on the lower; **4 levels** — matches
the authored `TREASURE_PERKS` grants L1–L4, decided 2026-07-16):
| L | reveal |
|---|---|
| L1 | **proximity** — notify + reveal when the player is _near_ a hidden corridor (built today) |
| L2 | **floor** — indicator that a hidden corridor exists _somewhere on this floor_ |
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
_or_ stumbled onto), NOT behind a key. So in the world-gen model a hidden path is a
**gated pathway** whose contents are an **optional loot pocket** (the §E sense — see
`keys-and-locks-solver.md`): always structurally reachable, but off the guaranteed path,
so only _optional_ loot may sit there (never a progression-gating currency the solver
must guarantee). This makes the corridor detector a genuine loot-access perk, not just a
cosmetic reveal — its payoff is the optional pockets it surfaces.

### 7.4 Perk system — the unlock mechanism

Perks are DERIVED from the tomb treasures held and read by the owning mod. Nothing is
written on claim, so holding the treasure _is_ holding the perk:

- **Seam:** `registerEarnedPerks(() => Perk[])` — the tomb-treasure mod folds its held
  ward keys through `TREASURE_PERKS`. Merged: `useMergedEarnedPerks() → Perk[]`.
  Each owning mod folds its own values with `perkLevel` / `perkStacks`
  (`src/game/perkTotals.ts`): max level for a tiered perk, one stack per treasure for a
  stacking one.
- **Why derived:** retuning which treasure carries a perk retunes every existing save at
  once, instead of only reaching players who claim afterwards. It also makes stacking
  perks idempotent (the old `+1` write inflated permanently on a double dispatch) and
  means a key granted by any other path — e.g. the dev menu's "All treasures + keys" —
  carries its perk too.
- **Description seam:** `registerPerkContribution(() => ({ describe }))` per mod. Merged
  `useMergedPerkContributions() → { describe }`.
  - `describe(perk) → { label } | undefined` — translatable bonus text from the owning
    mod's i18n namespace (undefined for perks it doesn't own).
- **Payload:** open descriptor `{ type: string; level?: number }` (mods coin perk ids,
  same as the open `TreasureReward` rule). No shared union import.
- **Delete** the dormant `perkRegistry` + `registerPerks` (+ spec) — registered at boot
  but never read; each mod's contribution now owns its cap/bump logic.
- **Claim:** `tomb-treasure`'s `tombKey` reward effect only calls `addTombKey` — the perk
  follows from holding the key. tier-unlock/location-key/`none` fold to nothing (they were
  always read straight off the held keys); `tomb-treasure` `describe`s those lines itself.

**Perk homes** (each perk is derived by its owning gameplay — closes the last
§D-class core-state leak):

| home (derives it; stores nothing) | perks                                                             |
| --------------------------------- | ----------------------------------------------------------------- |
| trap `useTrapProgress`            | max-health, armor, trap-insight, pack-mule, **supplies-detector** |
| hieroglyph progress hook          | **compass**                                                       |
| puzzle progress hook              | scribes-eye                                                       |
| core `mods/core/app/index.ts`     | **corridor-detector**                                             |

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

### 7.7 Toggle-off

- trap/puzzle/hieroglyph off → their perk contribution unregistered → `grant` no-ops,
  `describe` → undefined → Collection shows the treasure with no bonus line. Compass/
  supplies mode simply absent (no scanner/level source). World unaffected.
- The corridor detector (core) is always present; its payoff (hidden pockets) exists
  independent of any mod.

## 8. Locked decisions + perk catalog

### 8.0 Locked decisions

- **Seam = contribution-driven** `registerPerkContribution(() => ({ grant, describe }))`,
  merged like `rewardContributions` — replaces the dormant `perkRegistry` / `registerPerks`.
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
- **Tiers** (§7.2): a detector's precision scales with its level; level 0 = off.
- **Storage**: no version bump — dropped core perk slices are harmlessly ignored in old
  blobs; new mod-state fields default (`?? 0`); perks were all baseline (dead) so no data
  lost.
- **Out of scope of the whole plan**: re-authoring which treasure grants which perk (keep
  `TREASURE_PERKS` as-is); rebalancing the perk economy ("just never wired", not a redesign).

### 8.0.1 Perk catalog (the authority)

Each mod's `grant` implements its own bump. `bump`: `inc` = `min(cap, cur+1)`, `set` = fixed
value, `toLevel` = `max(cur, grantedLevel)`.

| perk              | owner      | field                     | cap | bump    | effect (consumer)                                                                   |
| ----------------- | ---------- | ------------------------- | --- | ------- | ----------------------------------------------------------------------------------- |
| max-health        | trap       | `maxHealth`               | 12  | inc     | health cap in **half-hearts** (base 6, +½♥ = +1); `HealthDisplay`/`TrapFamilyShell` |
| armor             | trap       | `armorStacks`             | 2   | inc     | reduces trap damage per stack (consumer exists)                                     |
| trap-insight      | trap       | `trapInsightStacks`       | 2   | inc     | +1s/stack in `TRAP_TIME_LIMITS_SECONDS`                                             |
| pack-mule         | trap       | `packMuleLevel`           | 1   | set 1   | consumable carry cap `lvl===1 ? 4 : 2`                                              |
| supplies-detector | trap       | `consumableDetectorLevel` | 3   | toLevel | supplies detector                                                                   |
| compass           | hieroglyph | `compassLevel`            | 3   | toLevel | fragment compass                                                                    |
| corridor-detector | core       | `detectionLevel`          | 4   | toLevel | hidden-corridor reveal                                                              |
| scribes-eye       | puzzle     | `scribesEyeLevel`         | 3   | toLevel | tableau hint slots; `TombPuzzle`/`TombTableau`                                      |

Non-perk `TREASURE_PERKS` types (`tier-unlock`/`location-key`/`none`) are NOT granted via the
seam — `addTombKey` + discovery handle them; tomb-treasure `describe`s their Collection line itself.

**i18n (decided):** no per-mod locale namespaces exist (flat `common/treasures/…`). Perk bonus
text goes in **`treasures.json` under `perks.<type>`** (replacing the stale `effects` block, which
is old vocab). Each mod's `describe` reads its own `perks.*` keys via `t(…, {ns:"treasures"})` —
shared namespace, mod-owned keys (same pattern as `sellables`). Off-mod keys sit unused (harmless;
`describe` isn't called when the mod's off).
