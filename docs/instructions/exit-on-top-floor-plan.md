# Exit on the top floor only — plan

**Apply when building the rule "only floor 0 has a way out".** Designer's decision: only the top floor
(floor 0, the entrance level; the pyramid goes down) has the exit, the glowing pillar, so the player leaves
after the main path. A player who goes a floor deeper for a wing comes back up by the stairs.

---

## 1. Current state

**Where exits come from.** `FloorConfig.exitOrStaircase` (`src/worldGen/types.ts`) is `"exit" | "staircase" |
{ stairId }`. `buildFloor` defaults it to `"exit"` (`src/worldGen/buildSite.ts`). `wireStaircases` overwrites
it with a stair id on every main floor except the last; nothing else touches it. The carve pass `mainRooms`
(`src/game/carve/mainRooms.ts`, last lines) writes a `portal` without `stairId` on the maze's terminal node
`state.maze.exit` when the value is `"exit"`. `growMaze` makes that terminal a true dead end. The goal chest sits
one node before it (`placeMainContent` keeps the last index free). `portalKindOf` (`src/game/roomFootprint.ts`)
reads a portal as `"exit"` when it has no stair id and is not the entrance. `cellSlot` gives it the slot `"exit"`.
`validate.ts` requires the last floor of every site to be `"exit"`.

**Which floors have one (baked `generatedWorld.ts`, 95 sites, 67 of them multi-floor).** Every floor except the
non-last main floors has an exit. That makes **111 exits below floor 0**:

| Shape                     | Sites           | Floors below 0 with an exit       |
| ------------------------- | --------------- | --------------------------------- |
| floor 0 + ward wing(s)    | 37 pyramids     | 38 (wings: `XX`, one `XXX`)       |
| wizard `mainFloors: 2`    | 21 pyramids     | 42 (floor 1 main + floor 2 wing)  |
| tomb, one floor/treasure  | 9 tombs         | 31 (floors 1..N)                  |
| single floor              | 28 pyramids     | 0                                 |

**How main paths span floors.** Only wizard has `mainFloors: 2`. There the main path ends on **floor 1**, and
**floor 0 has no exit at all**: its main end is the stairhead down. Every other site ends its main path on
floor 0. Wings and tomb floors are side content reached by a side-section stairhead. A deeper floor's entrance
is a portal with the paired `stairId`, so the way back up already works: a tap offers `"stairs"` and
`stairPeerPosition` moves the explorer.

**How the explorer leaves.** `useSiteNavigation` offers `"exit"` on any portal that is neither a stair nor
`grid.entrancePos`. The floor-0 entrance is only walked onto and offers nothing. A yes runs `useSiteExit` →
`EntranceTransitionOverlay` → `react({kind:"siteLeft"})` (tomb bond beats) → `onSiteComplete` →
`useExpeditionFlow.interiorComplete`, which advances to the next level on a first visit. **Level completion
fires only on an exit.** The HUD back button (`onCancel`) always leaves without completing. Re-entry restores
the saved `positionKey`/`standingKey`, so a player stuck below **stays** stuck below.

**Walk-back cost.** Walking is 120 ms per cell (`walkDelay`). The player taps a revealed target, so a revealed
floor takes about one tap to cross plus the pans. From a wing's chest, the player walks that wing's main path back
to its entrance stair, then from the floor-0 wing stairhead to the exit, a few seconds each. Wizard is the long
case: the floor-1 main path plus all of floor 0. A tomb's floor T walks back up through T floors (up to 5 in the
junior tomb).

## 2. The target

- **Floor 0 holds the site's only exit**, at its main path's end as now. No floor below 0 has an exit.
- **A deeper floor's main path ends at its goal chest.** The chest is the terminal dead end, with no empty stub
  past it. The way out of a deeper floor is its entrance stair, which already goes back up. New value:
  `exitOrStaircase: "none"`.
- **Tombs: the same rule** (recommended, Q3). A tomb is a pyramid interior in structure (§8 of
  `pyramid-interior-design.md`). Its loop already backtracks floor T to the gate, so leaving continues that walk.
- **Entrance vs exit.** The entrance cannot replace the main-end exit, because the designer wants a player to
  "leave after the main path". The floor-0 entrance **can also** offer leaving, and wizard needs that (Q1).

## 3. Consequences

**Structural.** `exitOrStaircase` is structural (`world-spec-stability.md`), so every floor below 0 re-carves:
111 floors in 67 sites. Every floor 0 stays byte-identical, except wizard's if Q1 picks a carve option. Board
dealing shifts with the room counts, so re-run `yarn generate-seeds` / `yarn verify-seeds`. Pre-release, so
re-bake freely (check first for an uncommitted playtest bake).

**Saves.** Nothing is released yet. This sits **outside** the reshape release, which is about the
`siteAssembler` shuffles. It is keyed the same way, by authoring address + slot. Rooms keep their slots (`p0`,
`xtreasure-chest`, `stair:…`). Only the `"exit"` slot disappears below floor 0, and an orphaned entry is
harmless. Two things need a test:

- A `position` filed at a removed exit slot must resume somewhere valid (the floor's entrance).
- `exitOrStaircase` is a `sectionHash` input, so the hash of each deeper main section moves.

Land it **before the starter release**, which carries starter_1 p1's wing, starter_2's two wings and starter
tomb floors 1–3.

**Reachability: the exit was the escape hatch.** Today a region past a one-way only has to reach the exit
(`regionRoute` in→out, `strandedRegions` from `in`). `siteValidator` even reasons that "a player holding such
a key re-enters the floor from its entrance". That is false in play, because re-entry restores the position.
Under the rule, two new checks are needed:

- On a floor > 0, every place reachable from the entrance reaches the entrance again.
- On floor 0, every stairhead a player arrives on from below reaches the exit.

Measured: **no floor below 0 carries `oneWays`, `locks`, `obstacles`, `controls`, `forks` or `regionLayout`
today**, so the first check is a guard for future authoring. The second check bites on **14 floor-0 lock floors
that also hang a wing**:

- junior_1 p3, junior_2 p3–4, junior_3 p3–4, junior_4 p4–5
- expert_1 p3–4, expert_2 p3–4, expert_3 p4–5, expert_4 p4–5

**Designer's locks.** doubleBack (expert_3 p5) and stoneGate (expert_4 p5) both sit on floor 0 (`floorLocks: {0}`)
and **both pyramids hang a ward wing off that floor**. Neither relies on a deeper exit, and their headers must not
change. If the stairhead check refuses one, the fix is the wing stair's placement or the seed, never the `.lock`
(Q8). The world's key solver (`worldGen/reachability.ts`) reasons about gates and keys, not exits, so it is
unaffected.

**Restore / high-water.** `repairFloorExploration.exitOf` already returns null for a floor with no exit (wizard
floor 0), so the chest carries the high-water mark below 0. Cover this with a test, not an assumption.

**Expedition flow.** Completion still fires only on the floor-0 exit. A wing exit no longer completes the site, so
a first visit that goes into a wing completes when the player comes back up and leaves. Recommended: keep it so
(Q5).

**Tests that freeze exits per floor today** (they change with the rule):

- `buildSite.spec.ts`: "leaving the last floor untouched", `floors[2]` is `"exit"`
- `validate.ts` + `validate.spec.ts`: "last floor … expected exit"
- `configBuilder.integration.verify.ts`: "every floor's main path ends in a real exit" (junior tomb)
- `lootEconomyInvariants.verify.ts:45`: a mainEndReward is required on exit floors, so extend it to `"none"`
- `stairTravel.spec.ts` / `assembleFloor.spec.ts`: `exitPos` stays the main path's terminal, so it still holds

## 4. Build plan

1. **Authoring value.** Add `"none"` to `exitOrStaircase` and its serializer. `buildSite` sets `"none"` on every
   floor index > 0 in all three branches, and on the wizard main floor 1. `validate.ts` requires floor 0 to have a
   way out (shape per Q1) and refuses `"exit"` below 0. *Freezes:* `buildSite.spec` (one case per branch: floor 0
   exits, every deeper floor `"none"`) and `validate.spec` (an exit below 0 is refused, a floor 0 with none is
   refused).
2. **Carve.** For `"none"`, the maze terminal is the goal. `placeMainContent` lets the goal take the last index
   and `prepareFloor` sizes one node fewer. `mainRooms` writes no portal. *Freezes:* a carve spec over made-up
   floors ("a floor ending at its chest carves exactly one portal, its entrance, and the chest is a dead end"),
   plus `cellSlot` (no `"exit"` slot). Then bake: generate-world, validate-world, generate/verify-seeds,
   `worldFloorAssembly` sweep, tierFingerprints. Diff the result: every floor 0 must be unchanged.
3. **Way-home check.** Add a reverse-reachability refusal in `siteValidator`/`regions`, with tests on made-up
   floors: a one-way into a pocket with no return is refused on floor 1, and a wing stairhead behind a one-way is
   refused on floor 0. Run it over the world and report any floor it refuses (Q8); do not edit locks.
4. **Leaving (per Q1/Q2).** The floor-0 entrance offers `"exit"` in `useSiteNavigation`. *Freezes:*
   `useSiteNavigation.spec` (the floor-0 entrance offers leaving, a deeper entrance offers the stairs) and the
   resume-from-removed-exit position test.
5. **Words and docs.** Fez's explanation line (§5). Optional: an up-stairs prompt label (Q6). Update
   `pyramid-interior-design.md` §2, §6 (examples), §7 and §8 ("the exit there returns to the overworld"), and the
   `buildSite.ts` comments that call a deeper stair "up". Add the CHANGELOG `## Unreleased` line.

## 5. The glowing pillar

The exit is a `portal` with no `stairId`. `SiteMapView.tsx` (`kind === "exit"`) draws it as a free-standing
shaft of light: the `exit` prop tile (`art/masters/props/default/exit.webp`, default-tier art), with a lamp pool
at its foot. The prompt is `ui.prompt.exit` ("Leave this place"). No line explains it today.

**Where the line belongs.** In Fez's meeting conversation, the `conversation` node `where: "last"` on starter_1
pyramid 1, floor 0. That is the last room before the first exit any player sees (`story/review.md`, "The opening").
Once only floor 0 has a pillar, one line covers it for the whole game, for example "the light is always up here;
below, take the stairs back". It belongs to Fez per the story rule ("Fez teaches the interior").

## 6. Open questions for the designer

- **Q1. Wizard's floor 0 has no exit** (its main end is the stair down). How does a wizard site satisfy "floor 0
  has the exit"? *Recommend:* the floor-0 entrance also offers leaving. It needs no carve change and makes the walk
  back end at the door the player came in by. Alternatives: an exit chamber hung beside the floor-0 stairhead (a
  new carve feature), or wizard drops `mainFloors: 2`.
- **Q2. Does the floor-0 entrance offer leaving on every site, or only on wizard?** *Recommend:* every site, as one
  rule ("the door you came in by lets you out"). The main-end pillar stays as the reward for finishing.
- **Q3. Do tombs follow the same rule?** *Recommend:* yes. The cost is walking back up to 5 floors in the junior
  tomb. The alternative is to exempt tombs and keep an exit per floor.
- **Q4. What ends a deeper floor's main path?** *Recommend:* the goal chest as the terminal dead end. The
  alternative, an empty dead-end node past the chest, keeps more of the carve but reads as a corridor to nowhere.
- **Q5. When does a level complete?** *Recommend:* only on leaving by floor 0, as now. The alternative is
  completing when the main path's last chest opens.
- **Q6. Should a deeper floor's entrance stair have its own prompt** ("Climb back up") instead of the generic
  stairs line? *Recommend:* yes. The copy is the designer's call.
- **Q7. Is Fez's meeting the place for the one-time pillar line?** *Recommend:* yes (§5).
- **Q8. What if the way-home check refuses a lock floor with a wing** (doubleBack expert_3 p5, stoneGate expert_4
  p5 among the 14)? *Recommend:* move the wing stair or re-search the seed. Never edit the `.lock`. Drop the wing
  only if neither lays.
