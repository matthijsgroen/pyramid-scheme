# Handover — keys-and-locks solver, mosaic extraction next

Branch: `mods/ledger-currency-registry`, all pushed, clean tree.

## Read first, in this order

1. `docs/game-design/keys-and-locks-solver.md` — the world-gen reachability
   solver. Read the whole thing; it's the single source of truth for the
   loot-placement model. In particular: "World-building phases" (the
   canonical 4-phase order), "Structure, then loot", "The placement
   algorithm", "Capped loot spreads", and "Open" (the live list of
   genuinely-unresolved items — everything else in the doc is settled).
2. `docs/mods-architecture.md` §"Collection is core; Mosaic is a mod's own
   screen — corrected" and §"UI wiring" — already answers "does mosaic
   need a screen-registry mechanism" (no — `Base.tsx` stays a hardcoded
   swipe deck, `MosaicPage.tsx` just moves folders).
3. `TODO.md` — live checklist, kept current all session. Recovery-plan
   section at the top is the most relevant one right now.

Do not re-derive any of this from code archaeology — read the docs first.

## What's actually done and shipped (3 commits this session, all pushed)

1. **The real worklist queue.** `reachability.ts`'s `collectReachableKeys`/
   `reachableFrom` now surface unsatisfied `requiredKeyId`/`requiredKeyIds`
   hit at the reachable frontier as `discoveredLocks` (plus a
   journey-scoped `mapPiece:<tombId>` lock when a tier is unlocked but
   `piecesRequired` isn't met). `placeFragments.ts` is a genuine queue —
   seeded from `discoveredLocks`, grown after every placement — not a
   precomputed static list. Verified via a live cascade trace before
   shipping (floors growing 12→31→53→...→156 as each currency's demand
   resolved, cross-tier locks appearing exactly per the doc's worked
   example).
2. **Map pieces migrated onto the queue.** `TreasureReward.fragmentSlot`
   gained a soft `prefers?: string` tag (a ranking hint, never an
   exclusive claim — inert once that currency's demand is satisfied).
   `src/worldGen/mapPieceCurrency.ts` (core, not `src/mods/` — every tomb
   needs one regardless of mods) implements the journey-then-pyramid
   diversity ladder. `CurrencyDistribution` gained its own `rank()` so
   different currencies can use different placement policies.
3. **Fixed a real, pre-existing authoring bug in `src/data/tableaus.ts`**
   — a "grind era" (repeated tomb replays) leftover never updated when
   large tombs got split into several journeys. Two bugs: secondary tombs
   silently duplicated the primary's exact symbols (keyed by difficulty,
   not tomb id), and ~3/4 of the generated grid was structurally dead
   (only `level 1` was ever read). Fixed via a row-slicing remap — row 1
   (unchanged formula, byte-identical to the original curated stories)
   goes to the primary tomb, rows 2/3/... to each secondary tomb in turn.
   **Follow-up correction, also shipped:** every row already had a real
   hand-authored story in `tableaus.json`, just filed under the primary
   tomb's id at a level nothing read — added a `storySource` map so
   secondary tombs resolve their real story instead of generic fallback
   text. All 40 real tableaus verified to resolve to genuine content.
4. **Validation ownership fix.** `EXPECTED_HIEROGLYPH_FRAGMENTS` moved off
   a core hardcoded import into an injected parameter
   (`validateRewardCounts(configs, expectedFragments?)`), sourced from the
   tableau currency's own module — same injection pattern
   `resolveKeyRequirements`/`currencies` already use.

`yarn generate-world`: 294/294 hieroglyph fragments, 31/31 map pieces.
Full suite 718/718, lint/types clean.

## What's next: mosaic extraction — designed, NOT started

Current ask: move mosaic into its own mod (`src/mods/mosaic/`), including
its screen, and migrate its placement onto the real loot-distribution
system (phase 3 of the doc's 4-phase model — capped loot). **No code has
been written for this yet** — the session got as far as investigation +
design agreement, then stopped. Read `keys-and-locks-solver.md`'s "World-
building phases" section before touching anything; the plan below assumes
it.

### What's already understood (don't re-investigate)

- **Mosaic's placement today is a separate, older, pre-worklist
  mechanism** (`src/worldGen/mosaics.ts`'s `computeMosaicPaths` +
  `src/worldGen/sideSections.ts`'s auto-mosaic-path loop), wired directly
  into `configBuilder.ts`. It decides a STRUCTURAL count (how many bonus
  side-paths a pyramid gets) and bakes `{type: "mosaicPiece"}` directly
  into those slots at construction time — the same "structure baking
  loot" violation map pieces had before their own migration.
  `reachability.ts` never harvests `mosaicPiece` at all today.
- **Fixing this the same way map pieces were fixed:** `rewards.ts`'s
  `hintToReward("mosaicPiece", …)` and `pathEndToReward("mosaic", …)` need
  to return a preference-tagged `{type: "fragmentSlot", prefers:
  "mosaicPiece"}` instead of the literal — same pattern already proven.
  `sideSections.ts`'s auto-mosaic-path loop (the
  `for (let j = 0; j < mosaicPathCount; j++)` block) needs the same
  change. `computeMosaicPaths` likely keeps its structural role (deciding
  *how many* bonus side-paths exist) — that's a legitimate "structure"
  decision independent of what reward eventually fills them — but must
  stop hardcoding the reward type.
- **Mosaic doesn't fit `CurrencyDistribution`'s shape.** That interface
  (`ownsBucket`/`demandFor`, discovered via the queue) is for currencies
  that *block progress*. Mosaic never blocks anything — it's pure phase-3
  capped filler. Needs a new, smaller shape — something like `{ bucket,
  toReward, totalRequired(allConfigs), rank(candidates) }` — placed by a
  **new phase in `placeFragments.ts`** that runs once the lock-queue
  drains: for each registered capped currency, rank all still-available
  slots, assign up to `totalRequired`, **hard-fail if short** (capped =
  must fully place, no exceptions — see the doc's "Exhausted relaxation is
  a build failure" applied to phase 3 too).
- **One pre-authored mosaic piece already exists as a literal** (a
  tomb-authored one, per `worldSpec.ts`'s old comment referencing "1
  tomb-authored piece") — the new currency's `totalRequired` math needs
  the same `countExisting`-and-subtract pattern hieroglyph/map-piece
  currencies already use, not a fresh count from zero.
- **Runtime state is much simpler than it first looks.**
  `mosaicPieceCount`/`collectMosaicPiece` in `useProgression.ts` already
  read/write the generic ledger (`ledger.get("mosaicPiece")` /
  `ledger.grant("mosaicPiece", 1)`) — **no extraction needed there**, same
  as `money`/`health`. The only genuinely mosaic-specific runtime state is
  `mosaicSeenCount` (reveal-animation progress, not a currency count) plus
  its setter `markMosaicViewed`. `src/app/state/useModState.ts` already
  exists for exactly this — a generic per-mod persisted slice
  (`useGameStorage(\`pyramid-scheme-mod-${modId}\`, …)`). Plan: a small
  `useMosaicProgress`-style hook in `src/mods/mosaic/app/` backed by
  `useModState("mosaic", 0)`, and remove `mosaicSeenCount`/
  `markMosaicViewed` from `ProgressionState`/`ProgressionAPI`. Cosmetic
  migration note: existing players' `mosaicSeenCount` resets to 0 once —
  no data loss (the ledger count is untouched), just a one-time replay of
  reveal animations already seen. Worth a one-line callout when it ships,
  not a blocker.
- **File moves (mirror `src/mods/tableau/`'s shape):**
  - `src/ui/atoms/mosaicRevealOrder.ts` → `src/mods/mosaic/game/mosaicRevealOrder.ts`
  - `src/app/pages/MosaicPage.tsx` → `src/mods/mosaic/app/MosaicPage.tsx`
    (stays hardcoded into `Base.tsx`, per mods-architecture.md — just a
    different import path)
  - Leave `StainedGlassMosaic.tsx`/`mosaicPieces.generated.ts` in
    `src/ui/atoms/` — pure stateless rendering, not mod-specific logic.
  - `src/ui/atoms/mosaicPieces.ts` (`MOSAIC_PIECE_IDS`) looks unused/dead
    — confirm and drop it during the move rather than carrying it over.
  - New `src/mods/mosaic/game/mosaicCurrency.ts` for the capped-loot
    currency.

### Concrete order for next session

1. Build the new capped-loot currency type + `placeFragments.ts`'s phase-3
   pass (world-gen only, no file moves yet) — get this working and tested
   in isolation against the *existing* mosaic placement mechanism still in
   place, so there's something to A/B against.
2. Switch `rewards.ts`/`sideSections.ts` to emit preference-tagged slots
   instead of literals; wire the new `MOSAIC_CURRENCY` in; delete
   `computeMosaicPaths`' reward-type logic (keep its count logic, or fold
   it into the currency's `totalRequired`+rank — judgment call, whichever
   is less code). Run full suite + `yarn generate-world`, confirm 298
   mosaic pieces still placed, confirm hieroglyph/map-piece counts
   unaffected.
3. Physical file moves into `src/mods/mosaic/`.
4. `useMosaicProgress` hook + `useProgression.ts` cleanup.
5. Update `TODO.md`'s recovery-plan section (phase 3 line) and
   `keys-and-locks-solver.md`'s "Open" section once shipped.

**Do each of these as its own commit** — this session's mistake was
letting the mosaic task's scope grow live across investigation → design →
implementation without landing anything in between. Land step 1 before
starting step 2, even if it means a slightly awkward intermediate state
(two placement mechanisms coexisting briefly).

## Known still-open items (from `keys-and-locks-solver.md`'s "Open" section)

- Phase 4 (uncapped loot: sellables/consumables — max-%-occupancy + drop
  rate) — not designed at all, deliberately deferred until phase 3 is
  proven.
- Authored DSL drop rates for phase-3 capped currencies — floated as an
  idea, not committed to a shape; may not survive contact with "capped
  loot must fully place."
- Slot capacity (a shop's several-items stock) — not built, `Slot` is
  still single-assign only.
- The `registerMod` mod-container mechanism (`TODO.md`'s "Root gap"
  section) — separate, bigger effort, do after the above.
- Tomb interior runtime rebuild (persistent multi-floor sites) —
  construction is unified, the runtime rebuild itself hasn't started.
