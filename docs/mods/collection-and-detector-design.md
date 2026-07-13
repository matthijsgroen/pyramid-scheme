# Design — mod-owned Collection sections, design-system extraction, detector revival

Status: **DS-1 + MOD-1 shipped; DET-1 deferred.** Scope decided with the user:
(1) make the hieroglyph Collection section **mod-owned** (not a core conditional
render), (2) build Collection sections/tiles from **design-system primitives**.

**Detector/compass revival is OUT OF SCOPE for now** — it's shipped-but-dead
(`availableHieroglyphs={[]}`), endgame, and the riskiest, most independent piece.
Its analysis is kept in §3C + Appendix A as the record for when it's picked up;
the sequenced work below is only DS-1 + MOD-1.

Sequencing is in §6.

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

### 3C. Detector/compass revival, wired into Collection — DEFERRED (out of scope)

Kept as the design record; not built in this effort. See Appendix A for the
"why deferred" and the degrade-cleanly requirement that DS-1/MOD-1 must still
honor.

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

## 5. Open questions (confirm before/while building)

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

**DET-1 (detector revival) — deferred, out of scope.** When picked up: hoist or
persist detector state; add target-picking on Collection; rewrite provider
search counter-native (looted = explored-state, not per-piece) +
reachability-aware; optional navigable results. Depends on DS-1 + MOD-1.

---

## Appendix A — why the detector is deferred

The compass is shipped but **functionally dead** (`availableHieroglyphs={[]}`),
gated behind endgame perks, and the largest/riskiest of the three concerns
(shared-state hoisting + a counter-native reachability-aware provider search +
reward→cell→explored plumbing). It's also fully independent of the section and
design-system work. Deferring it de-risks DS-1/MOD-1 with zero coupling cost.

The one constraint it leaves on DS-1/MOD-1: the Collection UI must **degrade
cleanly when the fragment currency isn't registered** (mod off) — no dangling
hunt affordance, no assumption a detector exists.
