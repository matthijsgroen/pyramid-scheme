# Mod architecture — status

Design docs: `docs/mods-architecture.md`, `docs/game-design/keys-and-locks-solver.md`.
Detailed handover: `docs/handover-mods-keys-and-locks.md`.

## Mods architecture (`docs/mods-architecture.md`'s 6-step order)

- [x] 1. Generic ledger + currency registry
- [x] 2. Perk grant/consume split (trap / puzzle / core)
- [x] 3. Family registry unification — one registry, one `encounter` room type, gate is a
      registered family, soft-gated everywhere (never a hard block on approach)
- [ ] 4. Reward-weight fill-order
  - [x] groundwork landed: `FamilyMeta.rewardWeight`, `src/mods/*/{game,app}/` folders,
        `allFamilyMeta.ts`
  - superseded — the real consumer isn't being built the original way; folded into the
    keys-and-locks solver below instead
- [ ] 5. `Distribution` primitive — the real `siteAssembler.ts` core-loop rewrite (replaces
      `trapped`/`puzzleFamily`/`lastMainPuzzleFamily` with weight normalization; `sealed` /
      ward-path-trapped / shop map-piece relocation become `CappedPool` site instances).
      Do last, once everything below has proven the model on smaller pieces.
- [ ] 6. Cleanup (can ride alongside any step above)
  - [ ] HUD → generic `showInHud`-metadata loop
  - [ ] i18n split per mod
  - [ ] physical `mods/` folder moves, incremental

## World-gen backlog (`docs/handover-mods-keys-and-locks.md`)

- [x] Node-type collapse — `RoomType` is now `portal | fork | encounter`
- [ ] Tomb interior rebuild — tombs become persistent multi-floor sites, one floor per
      treasure (same pinned-seed/`completionCount` treatment pyramids already get in
      `useJourneys.ts`); kills `TombExpedition.tsx`'s `renderPuzzle` prop
  - [x] world-gen *construction* unified — tombs and pyramids both build through the same
        `buildSite()` (tomb-flavored authoring stays tomb-flavored: `wardPath()`, the
        perk-stream resolver, `"tomb-puzzle"` encounter, crocodile capstone)
  - [ ] runtime persistent-site rebuild itself — not started
- [ ] Keys-and-locks solver
  - [x] coarse reachability graph (`src/worldGen/reachability.ts`) — one `OwnedCounts` model,
        every lock is "held count of bucket X ≥ threshold(X)"
  - [x] composable distribution-rule primitives (`src/worldGen/distribution.ts`)
  - [x] candidate slot discovery (`src/worldGen/slots.ts`)
  - [x] worklist-driven placement for hieroglyph fragments (`src/worldGen/placeFragments.ts`),
        wired end-to-end into `configBuilder.ts` → `scripts/generateWorld.ts`, 273/273 placed
    - found + fixed 3 real pre-existing bugs along the way: a `starter.ts` map-piece
      deadlock (gated behind its own tomb's tier-unlock treasure), a `siteAssembler.ts`
      key-host reward-hijack (both the ungated entry point and the chain-internal relay —
      confirmed silently dropping hieroglyph fragments in real generated data, proven by a
      regression test before the fix), and a `mosaics.ts` undercount
  - [ ] generalize the worklist beyond hieroglyph fragments, if another currency ever needs
        reachability-gated placement (map pieces / ward-keys stay fully deterministic today —
        no known need yet)
  - [ ] filler-loot fill-the-rest pass generalized into the same composable pipeline
        (currently a plain fill pass inside `placeFragments.ts`)
