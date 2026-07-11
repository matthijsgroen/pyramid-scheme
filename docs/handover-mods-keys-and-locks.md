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

Everything below is real, substantial implementation work, zero code
written yet:

1. **Node type collapse** — `RoomType` (`entrance|encounter|fork|gate|stairhead|exit`)
   → `portal|fork|encounter`. Gate becomes a registered family
   (`id: "key-gate"`), same `FamilyPlugin` contract as any other encounter
   (click-to-attempt, "need key" message, `onSolved`). `entrance`/`stairhead`/`exit`
   unify into `portal`.
2. **Tomb interior rebuild** — tombs become persistent multi-floor sites
   (`SiteConfig[]`, one floor per treasure), same `isInteriorPyramid`
   treatment pyramids already have in `useJourneys.ts` (pinned seed, capped
   `completionCount`). Kills `TombExpedition.tsx`'s `renderPuzzle` prop and
   its `completionCount`-keyed live tableau selection entirely.
3. **The keys-and-locks solver itself** — the reachability graph (two
   levels: coarse floor/tomb/journey graph over the existing unchanged
   per-floor `reachableFrom` in `siteValidator.ts`), the worklist-driven
   placement loop, composable filter/rank distribution rules, slot
   capacity (shop stock), hard-fail on exhausted relaxation. This is the
   biggest single piece and everything else depends on it working
   correctly — **the reachability graph must understand every existing
   gate type (floor-key, tomb-key/ward, map-piece tomb-entry) from day
   one, that part can't land incrementally.** Which currency's *placement
   decision* moves onto it first can still be incremental — hieroglyph
   fragments are the natural first slice (real existing implementation to
   replace and measure against: `fragments.ts`, confirmed "273/273 placed"
   this session).
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
Node-type collapse (#1) can land independently/first — it's a pure
refactor with no new behavior (gate already resolves via `getFamilyPlugin`
today, this just makes that literal).

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
