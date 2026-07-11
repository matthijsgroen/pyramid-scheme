# Handover — mods architecture + keys-and-locks solver

Branch: `mods/ledger-currency-registry`, PR #112 (draft), all pushed, clean tree.

## Read first, in this order

1. `docs/mods-architecture.md` — steps 1–4 (steps 1–3 fully implemented and
   committed; step 4's `rewardWeight` field exists but nothing consumes it
   yet — superseded by #3 below anyway).
2. `docs/game-design/pyramid-interior-design.md` §8 — tomb interior
   redesign. Fully resolved design, zero open questions. Not implemented.
3. `docs/game-design/keys-and-locks-solver.md` — the world-gen reachability
   solver + node-type collapse (gate/portal → `encounter`/`portal`).
   Fully resolved design (see its own "Open" section for the handful of
   genuinely-unresolved implementation details — everything else there is
   settled, not up for re-litigation).
4. `docs/game-design/shop-mechanic.md` — durable shop reference, unrelated
   to the above but reconstructed this session (was missing).

Do not re-derive any of this from code archaeology — it's all already
decided. If something in code contradicts these docs, the docs are current
truth (dated 2026-07-11) and the code hasn't caught up yet.

## What's actually done (code)

- Mods steps 1–3: ledger/currency registry, perk grant/consume split,
  family registry unification with real DI into `assembleFloor`.
- Step 4 groundwork: `FamilyMeta.rewardWeight` field exists
  (`src/game/families/familyMeta.ts`), physical `src/mods/<mod>/{game,app}/`
  folder structure landed, `src/mods/allFamilyMeta.ts` (domain-safe central
  index) and `src/mods/registerAllFamilies.ts` (app-layer registration)
  exist. Nothing consumes `rewardWeight` yet — don't build that consumer,
  it's superseded by the keys-and-locks solver's placement model (see
  doc #3 above, "Relationship to CappedPool / reward-weight / Distribution").
- All 4 PR #112 review comments addressed and pushed.

## What's designed but NOT implemented — the actual backlog

1. ~~**Node type collapse**~~ — done. `RoomType` is now `portal|fork|encounter`.
   Gate is a registered family (`id: "key-gate"`, `src/mods/core/{game,app}/keyGate/`),
   same `FamilyPlugin` contract as any other encounter — click-to-attempt,
   "you don't have the key yet" message (`gate.*` i18n keys), `onSolved`.
   `entrance`/`stairhead`/`exit` unified into `portal` (distinguished at
   render/click time by `stairId` presence and `grid.entrancePos`, not by a
   separate roomType). Gating turned out to already be a *hard* block on
   approach (`gridNavigation.ts` marked a keyless gate `"visible"`, never
   clickable) — this was corrected to match the soft model this doc and
   `pyramid-interior-design.md` §8 both specify: a locked gate is now always
   reachable/clickable, the lock check moved into the family's own
   `generate`/`Component` (via new `FamilyContext.requiredKeyId`/`ownedKeys`
   fields). So this landed as slightly more than a pure rename — the
   click-dead-end bug flagged during recon (`SiteMapScreen.tsx`'s old
   `handleCellClick` had no `"gate"` case at all) is fixed as part of the
   same change, not deferred. All 775 existing tests + `yarn validate-world`
   pass; `yarn lint`/`yarn tsc -b` clean.

Everything below is real, substantial implementation work, zero code
written yet:

2. **Tomb interior rebuild** — tombs become persistent multi-floor sites
   (`SiteConfig[]`, one floor per treasure), same `isInteriorPyramid`
   treatment pyramids already have in `useJourneys.ts` (pinned seed, capped
   `completionCount`). Kills `TombExpedition.tsx`'s `renderPuzzle` prop and
   its `completionCount`-keyed live tableau selection entirely.

   - **World-gen construction is already unified** — `configBuilder.ts`'s
     `buildTombConfigs` used to hand-roll its own floor-array + stairhead-
     wiring loop, diverging from `buildSiteConfigs`/`buildSite.ts`'s shared
     mechanism. Fixed: tombs now author a `floors: FloorConstraint[]` array
     (tomb-flavored authoring stays tomb-flavored — `wardPath()`, the
     perk-stream reward resolver, `"tomb-puzzle"` encounter, crocodile
     capstone) and call the SAME `buildSite()` pyramids' own authored
     `floors[]` mode uses. `buildSite()` was generalized to resolve
     `mainEndReward` per floor (a tomb's own treasure gates its own next
     floor — pyramid-interior-design.md §8's "the treasure IS the key" —
     previously only the site's last floor ever got one) and pass through
     `lastMainPuzzleFamily`; the two near-identical stairhead-wiring loops
     collapsed into one `wireSideSectionStaircases()`. Caught and fixed a
     latent stairId-collision bug in the process (multiple floors of one
     site could generate the same auto-numbered stairId, confusing
     `SiteMapScreen.tsx`'s cross-floor teleport lookup) — now scoped
     per-floor. This is unrelated to the persistent-site/`useJourneys.ts`
     work above; only the *generation* mechanism was unified, not runtime
     behavior. `generatedWorld.ts` was regenerated; the diff is fully
     explained by the stairId rescoping, reshuffled (still valid)
     puzzle-solve rewards, and expert/master/wizard tombs now correctly
     picking up their tier's `windyChance`/`packingChance` corridor-variety
     roll (previously silently dead for tombs specifically — see
     CHANGELOG.md).
3. **The keys-and-locks solver itself** — the reachability graph (two
   levels: coarse floor/tomb/journey graph over the existing unchanged
   per-floor `reachableFrom` in `siteValidator.ts`), the worklist-driven
   placement loop, composable filter/rank distribution rules, slot
   capacity (shop stock), hard-fail on exhausted relaxation. This is the
   biggest single piece and everything else depends on it working
   correctly.

   - ~~Coarse reachability graph~~ — done, `src/worldGen/reachability.ts`
     (`computeReachability`/`reachableFloorsInSite`/`isJourneyEnterable`/
     `isTierUnlocked`). Not wired into `scripts/generateWorld.ts` yet — it's
     a standalone, fully-tested primitive (13 tests) the worklist loop will
     call repeatedly as it grows `ownedKeys`, per the doc's own scoping.
     Two real gaps found+fixed during review, both worth knowing before
     building on top: (a) `siteValidator.ts`'s `reachableFrom` is now
     exported, and its iterative key-collection loop was extracted into a
     new exported `collectReachableKeys` — the coarse graph needs the same
     fixed point *within* a floor (a tomb's own treasure is the key to its
     own next floor, pyramid-interior-design.md §8) that `validateSite`
     always had, just never as a reusable function; (b) floor-to-floor
     stairId hosting is NOT always `site[i]` → `site[i+1]` — ward-wing
     branches (`buildSite.ts`) can all anchor off one earlier "host" floor
     as siblings, not a linear chain, so `reachableFloorsInSite` searches
     every later still-unreached floor against each newly-reachable one,
     not just its immediate successor. Both cases now have dedicated tests.
   - ~~Distribution rule primitives~~ — done, `src/worldGen/distribution.ts`
     (`pipe`/`filterBy`/`uniqueBy`/`rankBy`/`preferThenRelax`, 6 tests).
     Generic, currency-agnostic, not yet composed into a real per-currency
     rule.
   - ~~Candidate slot discovery~~ — done, `src/worldGen/slots.ts`
     (`collectSlots`, 4 tests). Generalizes `fragments.ts`'s own
     `collectSlots` with per-slot `FloorRef` tagging so a distribution rule
     can filter by reachability. Deliberately near-duplicates
     `fragments.ts`'s tree-walk for now (flagged debt, not a bug) — the two
     should collapse into one once the worklist actually replaces
     `fragments.ts`.
   - **A real gap found and fixed while building this**: the reachability
     graph didn't know a tableau room's own hieroglyph requirement at all —
     it only checked `requiredKeyId` (a gate's single-treasure
     precondition), so it silently treated every tableau as trivially
     solvable. Since rooms are soft-gated (always walkable-up-to, but
     nothing past an uncompleted room is ever revealed — same rule for
     gates and puzzles), this meant the solver overestimated reachability
     for every tomb floor past the first. Fixed, keeping ALL hieroglyph/
     tableau knowledge out of core:
     - `RoomCell` gained two fully generic fields: `requiredKeyIds?:
       string[]` (same idea as `requiredKeyId`, but a list — all must be
       owned; a tableau needing 3 hieroglyphs complete is 3 independent
       locks, not one composite key) and `pathIndex?: number` (a room's
       0-based position among its floor's main-path puzzle rooms — pure
       structural data).
     - `siteAssembler.ts` gained an injected `ResolveKeyRequirements`
       function (mirroring the existing `ResolveEncounter` pattern), called
       per puzzle room — main path, side section, and sub-section, each
       using its own section-scoped 0-based path-position index (same one
       already computed for `puzzleRewards[k]`/`[pi]`). New params are
       bundled into one trailing options object (`{resolveKeyRequirements,
       floorRef}`), not raw positional args — avoids the "pass `undefined`
       to skip an earlier optional param" problem `ResolveEncounter` alone
       didn't have room for.
     - `siteValidator.ts`'s `reachableFrom` (the fine BFS) now also checks
       `requiredKeyIds`.
     - A generic `encounterArgs?: unknown` DSL field (on `FloorConfig` and
       on `SubSection`/`SideSection`) lets an author attach an opaque
       payload to any corridor's rooms — threaded through `dsl.ts` →
       `sideSections.ts`/`buildSite.ts` → the runtime config `assembleFloor`
       reads. This decouples a tableau corridor from floor position
       entirely: it can be authored on the main path or on a ward-gated
       side path, and two corridors on the same floor can each carry their
       own payload.
     - The only place that knows hieroglyphs/tableaus exist:
       `src/mods/puzzle/game/tableau/keyRequirements.ts`. It validates
       `encounterArgs` via zod (`{runNr: number}`), throwing on a bad/
       missing shape, then looks up `tableauLevels` by
       `(journeyId, runNumber: runNr, levelNr: pathIndex + 1)`, throwing if
       nothing matches — a tagged tableau room must always resolve to
       something. Aggregated by `src/mods/allKeyRequirementResolvers.ts` (a
       plain, side-effect-free `Record<familyId, resolver>` mirroring
       `src/mods/allFamilyMeta.ts`'s shape). **`reachability.ts` does NOT
       import this aggregator directly** — `docs/instructions/
       architecture.md`'s dependency table doesn't actually list
       `src/mods/` as importable from `src/worldGen/`, and `allFamilyMeta.ts`
       turned out to be an unused/aspirational precedent, not a working
       one, when checked. `reachableFloorsInSite`/`computeReachability`
       default to a no-op resolver instead (same as `assembleFloor` never
       importing the real `resolveEncounter`); whoever wires this into a
       real script supplies the real one.
     - **A real mapping bug caught by review, not by me** (now superseded):
       `tableauLevels`' `runNumber` is which *replay*/treasure a tomb floor
       unlocks (`completionCount + 1`, per `TombExpedition.tsx`/
       `TableauInventory.tsx`), and `levelNr`/array position is which room
       within that run — the opposite of what reading the generator code in
       isolation suggested. The original fix hardcoded `runNumber === 1`
       (world-gen only ever building "run 1"); that's since been replaced
       by the `encounterArgs.runNr` mechanism above — `configBuilder.ts`'s
       `buildTombConfigs` now authors `encounterArgs: {runNr: i + 1}` per
       floor by default (tying each floor's tableau to the treasure it
       unlocks, "grind era" style), verified against every real tomb
       (`treasures.length === levelCount` for all 9) so the default never
       fails to resolve.
   - Still to build: the worklist loop itself (a queue of not-yet-satisfied
     locks, recomputing reachability after each placement — this is now
     clearly load-bearing for hieroglyph fragments too, not just ward
     keys/map pieces, since fragments gate tableaus which gate everything
     past them), slot capacity, hard-fail on exhausted relaxation, and the
     hieroglyph-fragment migration measured against `fragments.ts`'s
     "273/273 placed" bar.
4. **Trap's hard gate needs to soften** — `canAttemptTrap()` currently hard-
   blocks (`TrapWarningScreen` won't launch the encounter at all below 1
   health). The tomb redesign's "soft gating everywhere" decision means
   this needs to change to match tableau/gate's soft model (always
   enterable, consequence/lock is about *solving*, not *approaching*).

## Suggested order of attack

Doc #3 (keys-and-locks-solver.md) is a prerequisite for #2 (tomb rebuild) —
the tomb design assumes fragment placement respects reachability, which is
exactly what the solver provides. Build the solver's reachability graph +
hieroglyph-fragment placement first, prove it against `fragments.ts`'s
existing "273/273 placed" bar, *then* rebuild tomb topology on top of it.
Node-type collapse (#1, done) landed first, independently, as planned.

## Not blocking, but worth knowing

- `docs/mods-architecture.md` sits at `docs/` root, not
  `docs/game-design/` — flagged as misplaced per
  `docs/instructions/documentation.md`'s own rules, not yet moved (user's
  call, was still open when this session ended).
- New doc rule this session: mechanic design and implementation plans are
  separate files with separate lifecycles (`docs/instructions/documentation.md`,
  "Implementation plan documents"). If a phased build plan gets written for
  the work above, keep it out of the design docs — separate
  `docs/<topic>-implementation-plan.md`, delete once shipped.

**Delete this file in the completion commit once this backlog is done or
re-scoped** — per its own lifecycle rule.
