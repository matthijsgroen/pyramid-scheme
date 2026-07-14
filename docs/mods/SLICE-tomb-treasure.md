# Slice plan — the tomb-treasure mod (the "last mod")

Agreed in discussion 2026-07-14. Extract `mapPiece` + `tombKey` out of core into ONE mod, so
"delete a mod, core untouched" finally holds for the last core-owned reward vocabulary. Read this
first, then `docs/mods/FIDELITY-AUDIT.md` (tomb-treasure bullet) + the hieroglyph mod as the
working template.

## Decisions (settled)

1. **One mod** (`tombTreasureMod`) owns BOTH `mapPiece` and `tombKey`. They're two standalone
   mechanics — mapPiece (found in pyramids) unlocks a tomb's entry (`piecesRequired`); tombKey (the
   tomb treasure: ward key ×36 + location key ×4, found in tombs) opens pyramid ward floors,
   self-gates the tomb's next floor, reveals the next tomb, and drives tier unlock — but they're one
   interdependent gameplay loop (enter with pieces, leave with keys), so one toggle unit.
2. **§E (keys → solver) is SEPARATE, later.** Keep `tombKey` a construction-time literal
   (`configBuilder.ts resolveTombReward`) + `validateDiscovery` for now. This slice just moves its
   reward handler/schema/state ownership to the mod. §E (ward+tomb keys as solver currency
   distributions) is its own slice; it overlaps but doubling scope doubles risk.
3. **map-piece branch uses the sentinel-fill pattern** (like hieroglyph fragments): the pyramid's
   map-piece branch emits a generic sentinel slot; `MAP_PIECE_CURRENCY.fill` (mod-owned) fills it —
   so core world-gen stops naming the `mapPiece` reward type. Today `sideSections.ts:102` authors
   `endReward: { type: "mapPiece", tombId }` directly — that's the one vocab leak to convert.
   **BUILD-TIME CHECK:** confirm the map-piece currency can target that specific positional/gated
   branch (map pieces are placed at an authored branch, not spread freely). If the sentinel can't be
   targeted cleanly, fall back to a mod-provided reward-builder hook for the branch. Explore first.
4. **State via a mod hook** (`useTombTreasureProgress` over `useModState`), mirroring §D's
   `useHieroglyphProgress`. Move `tombKeys`/`collectedMapPieces`/`mapPieceJourneys` + their methods
   out of core `useProgression.ts`. ~11 consumers switch (see list). Mechanical churn, accepted.
5. **Toggle-off = isolation test only** (root mod, stays on in production). tomb-treasure off →
   no map pieces / no keys placed → tombs unreachable/unbeatable, but `generate-world` + build
   succeed with NO core residue. (Same class as puzzle §H: a puzzle-less/tomb-less world is
   degenerate, not playable — the gate proves isolation, not playability.)

## Template — the hieroglyph mod (already does exactly this)

`src/mods/hieroglyph/index.ts`: `hieroglyphMod` owns `HIEROGLYPH_CURRENCY` (a `CurrencyDistribution`,
gating, on the reachability worklist) + `TABLEAU_META` (family) + `HIEROGLYPH_CURRENCY_META`. §D
moved its reward effect + state to `useHieroglyphProgress`/`useModState` and its handler/schema to
its app entrypoint. `MAP_PIECE_CURRENCY` (`src/worldGen/mapPieceCurrency.ts`) is the SAME
`CurrencyDistribution` shape — so this is "apply the hieroglyph pattern to tomb-treasure," not new
design.

## Concrete steps

1. **Explore first (do NOT skip):** how the map-piece branch places its reward. Read
   `src/worldGen/{mapPieceCurrency.ts,sideSections.ts,buildSite.ts,configBuilder.ts}` +
   `src/worldGen/placeFragments.ts` (worklist). Answer: does `MAP_PIECE_CURRENCY` already fill a
   slot, or does `sideSections.ts:102` author the reward directly (and is the currency redundant/
   for counting)? That decides step 3's shape. Also read `src/mods/hieroglyph/game/fragmentFinalize`
   for the §D finalize pattern if map pieces need any.
2. **Create `src/mods/tombTreasure/`** with `index.ts` exporting `tombTreasureMod: ModDescriptor`
   (`id: "tomb-treasure"`, `currencyDistributions: [MAP_PIECE_CURRENCY]`, `currencyMeta: …`). Move
   `mapPieceCurrency.ts` into the mod (`game/`). Add to `REGISTERED_MODS`.
3. **Map-piece branch → sentinel-fill** (per decision 3, pending step-1 findings): the pyramid
   branch emits a generic sentinel; the mod's currency `fill` bakes `{type:"mapPiece"}`. Core
   `sideSections.ts` stops naming `mapPiece`. Keep `hasMapPieceBranch`/`emitMapPiece` as structural
   flags (they don't name the reward type — fine to stay).
4. **Reward handlers + schemas → mod app entrypoint.** Move the `mapPiece` + `tombKey` blocks out of
   `src/app/SiteMap/registerRewardHandlers.ts` into `src/mods/tombTreasure/app/*` (register via the
   same `registerRewardHandler`/`registerRewardSchema` seam, gated on `isModEnabled("tomb-treasure")`
   — pattern: trap's consumable effect, §D). Core `registerRewardHandlers.ts` then names no reward.
5. **Progression state → mod** (per decision 4): new `useTombTreasureProgress` (over `useModState`,
   key `pyramid-scheme-mod-tomb-treasure`) owning `tombKeys`/`collectedMapPieces`/`mapPieceJourneys`
   + `hasTombKey`/`addTombKey`/`tombKeyIds`/`collectMapPiece`/`mapPieceCount`/`hasMapPiece`/
   `markMapPieceFound`/`discoverTomb`. Remove them from core `useProgression.ts`. `applyTreasurePerk`
   is a no-op today (§F) — move the stub too, or leave it a no-op in the mod.
6. **Migrate the ~11 consumers** off `useProgression`'s tomb methods to `useTombTreasureProgress`:
   `Travel.tsx`, `PyramidExpedition/ExpeditionCompletionOverlay.tsx`, `PyramidLevel/mapPieceLogic.ts`,
   `PyramidLevel/useLootDetermination.tsx`, `SiteMap/SiteMapScreen.tsx`, `SiteMap/registerRewardHandlers.ts`
   (removed), `ui/organisms/JourneyCard.tsx`, plus stories. `configBuilder.ts`/`buildSite.ts`/
   `sideSections.ts` are world-gen (structural flags, no state).
7. **currencyMeta** for map pieces (ledger/collection display) → the mod (if not already; check
   whether mapPiece is a ledger currency or just progression state).

## Verification

- **Byte-identity target** for the refactor: with tomb-treasure ON, `git diff --stat
  src/data/generatedWorld.ts` should be empty (if the sentinel-fill produces the same placement) —
  or a reviewable diff limited to the mapPiece-slot representation if sentinel changes the encoding.
  Reward counts (mapPiece 31, tombKey 40) must be unchanged.
- `yarn tsc -b --force`, `yarn build`, `yarn test --run` (718), `yarn lint` — all green. Independently
  run them; don't trust a subagent's "green."
- **Toggle-off test:** remove `tombTreasureMod` from `REGISTERED_MODS` (+ comment its import),
  `yarn generate-world` + `yarn build`. Expect: builds, no `mapPiece`/`tombKey` in core, world
  degenerate (tombs unreachable). Restore exactly. (May hard-fail a dependent invariant like the
  puzzle case — acceptable if it's a cross-mod dependency, not core residue.)
- Doc-fidelity review agent on the diff; then commit + push.

## After this

Core owns NO reward vocabulary (`siteTypes.ts TreasureReward` already open; `registerRewardHandlers`
becomes empty/deletable). Remaining: §E (keys → solver), §F (perks build-or-doc), §A.3 loot
`eligible` join, §G tomb content (playtest phase).
