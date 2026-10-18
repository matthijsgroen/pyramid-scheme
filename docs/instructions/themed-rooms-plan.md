# Themed rooms — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox
> (`- [ ]`) syntax for tracking.

**Goal:** every room with free cells is dressed by ONE purpose, and the ordinary room's purpose is an activity
(weighing, packing, storage, selling, ledger) whose props and wall item agree.

**Architecture:** one `ACTIVITIES` table in `src/game/` with `PROP_ROLES` derived from it; `carve/render.ts`
picks a purpose per room by precedence and writes the room's `activity` beside its `decoration`; the app's
companion rule reads that `activity`. Story rooms author their activity on the node selector.

**Tech stack:** TypeScript, Vitest. `yarn verify` is the gate; `yarn verify-content` after C4.

**Spec:** [docs/game-design/themed-rooms.md](../game-design/themed-rooms.md). Queue:
[docs/handover-starter-release.md](../handover-starter-release.md) § C.

## Global constraints

- Core (`src/game/`) never imports `src/worldGen/` or `src/app/`; the carve cannot see art.
- Deterministic from the site id: every pick goes through `hashString(\`${siteId}:<salt>:${pk}\`)`.
- Decorations, wall items and `activity` are free fields (`world-spec-stability.md`): no structural field moves.
  The `worldFloorAssembly.spec` sweep enforces the free/structural lists — `activity` goes on the free list.
- No tests on authored content ([[no-tests-on-authored-content]]): carve tests use made-up pools, not the
  starter pool.
- Comments state current state and why, never history. One-line commit messages.

## Decisions this plan takes (the spec is silent or contradicts itself)

1. **"Painted" means "in the rank's pool".** The carve cannot see art, so an activity is eligible in a room when
   the room's pool holds at least one of its props. A new kind enters a rank's `decorations` pool when it is
   painted (D2), not in C1. Placeholders exist so the story and the art census can show it.
2. **`mat` stays untagged** although it is listed under selling: the spec also names it filler. The derivation
   skips a `FILLER` set (rubblePile, pillar, mat), so mat can lead or follow a selling room but survives every
   role narrowing.
3. **`hanging` is a selling prop** (the spec: "the awning is the `hanging` prop"). Its funerary/cosmos roles stay.
4. **Kinds no activity owns yet keep their roles** in a `ROLE_ONLY` table (statue, sarcophagus, shrine, lamp,
   brazier, crystal, and the funerary roles of offeringTable/hanging, water of basin/jarRack, shop of shelf/
   jarRack). `PROP_ROLES` = union of activity roles and `ROLE_ONLY`. It shrinks as later ranks get activities.
5. **Treasure, shop and mechanism rooms get no activity prop.** Precedence 2 and 4: the chest/stall or the
   mechanism has the room. Today's endpoint dressing of treasure/shop rooms and of switch forks stops.
6. **A room with no eligible activity** (a funerary wing) keeps today's pick: any kind from the pool, wall
   narrowed by `wallSuiting`.
7. **An activity with no wall item** (packing, selling) hangs nothing.

---

### Task C1: the activity table, derived roles, six new kinds

**Files:**

- Create: `src/game/activities.ts`, `src/game/activities.spec.ts`
- Modify: `src/game/dressingTags.ts` (derive `PROP_ROLES`, `WALL_ITEM_ROLES` from activities + `ROLE_ONLY`)
- Modify: `src/game/siteTypes.ts` (`DecorationKind` += `scale | weightsTable | basketStack | bales | counter |
  scribeDesk`; `RoomCell.activity?: ActivityId`)
- Modify: whatever `yarn check-types` then demands for a new kind (tile resolver, art census, placeholder
  tiles — follow how `crystal` is handled; `scripts/generateDummyTiles.ts` makes placeholder PNGs)

**Produces:**

```ts
export type ActivityId = "weighing" | "packing" | "storage" | "selling" | "ledger"
export type Activity = {
  id: ActivityId
  props: readonly DecorationKind[]
  wall: readonly WallDecorationKind[]
  roles: readonly string[]
}
export const ACTIVITIES: readonly Activity[]
export const FILLER: ReadonlySet<DecorationKind> // rubblePile, pillar, mat
/** Activities with at least one prop in `pool`, in table order. */
export const activitiesFor: (pool: readonly DecorationKind[]) => Activity[]
```

Table, verbatim from the spec (+ decision 3):

```ts
export const ACTIVITIES: readonly Activity[] = [
  { id: "weighing", props: ["scale", "weightsTable"], wall: ["tallyBoard"], roles: ["trade", "shop"] },
  { id: "packing", props: ["basketStack", "bales"], wall: [], roles: ["trade", "logistics"] },
  { id: "storage", props: ["jarRack", "shelf", "basin"], wall: ["niche"], roles: ["trade", "logistics", "agriculture"] },
  { id: "selling", props: ["counter", "mat", "offeringTable", "hanging"], wall: [], roles: ["trade", "shop"] },
  { id: "ledger", props: ["scribeDesk", "shelf"], wall: ["tallyBoard", "niche"], roles: ["trade", "scribe"] },
]
```

- [ ] Step 1: failing specs in `activities.spec.ts`:
  - `PROP_ROLES` of every activity prop not in `FILLER` contains every role of every activity that lists it
    (shelf ⊇ storage ∪ ledger roles).
  - `PROP_ROLES` has no entry for a `FILLER` kind.
  - every `ROLE_ONLY` role survives in `PROP_ROLES` (union, not replacement).
  - `activitiesFor(["shelf", "rubblePile"])` → storage, ledger; `activitiesFor(["rubblePile"])` → `[]`.
- [ ] Step 2: `yarn test src/game/activities.spec.ts` → FAIL (module missing).
- [ ] Step 3: implement; `dressingTags.ts` keeps its exports (`PROP_ROLES`, `WALL_ITEM_ROLES`, `rolesOfProp`,
      `rolesOfWallItem`) so `worldGen/dressingRoles.ts` and `companionProps.ts` compile unchanged.
- [ ] Step 4: add the six kinds; `yarn check-types` until clean; placeholders for the six in the placeholder
      folder only (`tileUrl` skips `placeholder/`, so nothing places them by rule).
- [ ] Step 5: `yarn verify` → green. The derived roles move pools (`dressByRole`), so `generatedWorld.ts` may
      differ: do NOT re-bake here, C4 does. If a world spec fails on the artifact, note it for C4.
- [ ] Step 6: commit `feat: activity table, PROP_ROLES derived from it, six new prop kinds`

### Task C2: the carve dresses every room by purpose

**Files:**

- Modify: `src/game/carve/render.ts` (the DRESSING block of `renderGround`)
- Create or extend: `src/game/carve/render.spec.ts` (find the existing carve spec that builds a `FloorPrep` with
  made-up pools and follow it)
- Modify: `docs/game-design/world-spec-stability.md` free list + its sweep in `worldFloorAssembly.spec` (`activity`)

**Consumes:** `activitiesFor`, `ActivityId`, `RoomCell.activity` (C1). **Produces:** `RoomCell.activity` set on
every activity-dressed room.

The new rule, replacing "forks and endpoints":

```ts
// Purpose by precedence: story (C3) > mechanism > patron > treasure/shop > activity.
const isMechanism = (pk: string) =>
  state.switchRooms.has(pk) || state.forkSwitchRooms.has(pk) || state.forks.reserved.includes(pk) ||
  !!spec?.mechanism || !!spec?.mechanismId || spec?.requiredKeyId !== undefined || spec?.gateVariant !== undefined
const isTreasureLike = spec.roomType === "encounter" && (spec.tags?.includes("treasure") || spec.tags?.includes("shop"))
// every room in roomSpecs is a candidate; mechanism and treasure-like rooms are skipped,
// patron rooms keep today's god pick, the rest:
const eligible = activitiesFor(pools?.props ?? [])
const activity = eligible.length ? eligible[hashString(`${siteId}:activity:${pk}`) % eligible.length] : undefined
const propPool = activity ? pools.props.filter(k => activity.props.includes(k)) : pools?.props
const wallPool = activity ? pools?.wall?.filter(k => activity.wall.includes(k)) : wallSuiting(pools.wall, decoration)
```

Keep the existing `pickDressing` salts (`decoration`, `decoration:not-a-pit`, `wallDecoration`) and the
no-pit-beside-a-stair rule. Props already never stand on the node's cell (`roomClaims.ts` only offers empty
claimed cells) — keep it that way; a room with no empty claim simply draws nothing, which is today's behaviour.

- [ ] Step 1: failing specs, each on a made-up floor with pools `{ props: ["shelf", "jarRack", "rubblePile"],
      wall: ["niche", "tallyBoard", "sconce"] }`:
  - an ordinary puzzle room (not fork, not endpoint) gets a `decoration` and an `activity`.
  - the decoration is one of the chosen activity's props; the wall item is one of its wall items or absent.
  - a treasure room, a switch fork and a gate room get no `decoration` and no `activity`.
  - the patron room still gets the god's kind (existing spec keeps passing).
  - a pool with no activity prop (`["statue", "rubblePile"]`) dresses as before and sets no `activity`.
  - two renders of the same site are identical (determinism).
- [ ] Step 2: run → FAIL.
- [ ] Step 3: implement in `render.ts`; update the DRESSING comment to the new rule.
- [ ] Step 4: `activity` onto the free-field list + sweep; `yarn verify` → green except artifact-backed specs,
      which C4 re-bakes.
- [ ] Step 5: commit `feat: every room dressed by one purpose, ordinary rooms by an activity`

### Task C2b: the companion comes from the room's activity

**Files:** `src/app/SiteMap/companionProps.ts`, its spec, `src/app/SiteMap/roomClaims.ts:234-275`

- `companionFor`'s room record gains `activity?: ActivityId` (from `owner.activity`).
- With an activity: options = that activity's props, minus the leader, through the existing `hasArt` test.
  Without one: today's role rule. Odds (`SHARE`, `MIN_FREE`) and the shrine exception unchanged.
- [ ] Step 1: failing spec: a `storage` room led by a shelf picks jarRack or basin, never a selling counter even
      when both share the `trade` role; a room without activity behaves as today.
- [ ] Step 2: FAIL → implement → PASS; `yarn verify`.
- [ ] Step 3: commit `feat: a room's second prop comes from its activity`

### Task C3: story rooms borrow an activity

**Files:** `src/worldGen/dsl.ts` (`NodeSelector.activity?: ActivityId`, a sibling of `resolveNodeSelectors`
returning `Record<number, ActivityId>`), the path `encountersByIndex` takes into the carve (`buildSite.ts`,
`types.ts`, `serializer.ts`, `placeEncounters.ts`, the carve's room spec), `render.ts` (story precedence 1),
`src/worldGen/spec/starter.ts` (Ipi's room: `activity: "ledger"`; the floor-0 meeting room gets
`activity: "selling"` when E1 authors it — note it in E1's task, do not author the room here).

- A room whose spec carries an authored `activity` takes it whatever the pool says, ahead of mechanism; its
  props are the pool ∩ the activity's props, and when that is empty the activity's props unfiltered (a story set
  is authored, so it may name a kind the wing's role narrowed away).
- [ ] Step 1: failing specs: `resolveNodeActivities([{ where: "last", encounter: "conversation", activity:
      "ledger" }], 4)` → `{ 3: "ledger" }`; a carve with an authored activity on a room dresses it from that
      activity even when the hash would pick another.
- [ ] Step 2: FAIL → implement → PASS; `yarn verify`.
- [ ] Step 3: commit `feat: story rooms author their activity`

### Task C4: re-bake and confirm saves untouched

- [ ] Step 1: check for an uncommitted playtest bake (`git status src/data/`) — stop and ask if there is one.
- [ ] Step 2: `yarn generate-world`; update tier fingerprints as the doc's "Tier fingerprints" section says.
- [ ] Step 3: confirm only free fields moved: diff the old and new `generatedWorld.ts` site configs with
      `decorations`, `wallDecorations` and node `activity` stripped — must be identical. Save identity (authoring
      address + slot) is untouched by construction; say so with the diff as evidence.
- [ ] Step 4: `yarn verify` and `yarn verify-content` green; look at a starter floor in the A2 story and in the
      game (screenshot) — every room furnished, no prop on a node, no prop in a treasure room.
- [ ] Step 5: commit `chore: re-bake the world for themed rooms`; CHANGELOG `## Unreleased` one line.

## Review focus

1. **Entrance and stairhead rooms** now dress — the explorer's start room must not get a prop on its node cell
   or in front of the stair sprite (the pit rule covers only pits). Add to C2: a stairhead room's decoration is
   never `pit`, and nothing is placed on the stair's own cell.
2. **A one-cell room** (no empty claim) — dressing it in the carve is harmless only because `roomClaims` drops
   the prop; C2's spec asserts the carve still records the decoration and the claims place nothing.
3. **Wall-item monotony** — with every room dressed, one wall item can fill most rooms (the 19-of-97 measure in
   `companionProps.ts`). C4 Step 4 counts wall items per starter floor and reports the top share.
4. **Ward pockets** dress in their own rank's pool (exists): C2's spec includes a room whose `labels.dressing`
   pool differs from the floor's and checks its activity comes from its own pool.
5. **Patron rooms on a trade floor**: precedence keeps the god's room; the spec for decision 5 must not skip
   patron rooms that are also forks with a switch — mechanism wins (precedence 2 over 3).
