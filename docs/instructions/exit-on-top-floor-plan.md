# One exit per site — plan

**Apply when building the rule "a site has one way out".** Designer's decision: a site has exactly one exit,
the glowing pillar, at the END OF ITS MAIN PATH, on whichever floor that path ends. A player who goes a floor
deeper for a wing, or down a tomb, comes back up by the stairs.

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

| Shape                    | Sites       | Floors below 0 with an exit      |
| ------------------------ | ----------- | -------------------------------- |
| floor 0 + ward wing(s)   | 37 pyramids | 38 (wings: `XX`, one `XXX`)      |
| wizard `mainFloors: 2`   | 21 pyramids | 42 (floor 1 main + floor 2 wing) |
| tomb, one floor/treasure | 9 tombs     | 31 (floors 1..N)                 |
| single floor             | 28 pyramids | 0                                |

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

- **One exit per site, at the main path's end.** The main path runs from the floor-0 entrance down every floor
  `wireStaircases` chains, so the exit stands on the last of them: floor 0 for most sites, floor 1 for wizard
  (`mainFloors: 2`).
- **No other floor has an exit.** A wing floor, and every tomb floor below 0, is reached by a side-section
  stairhead; its way out is that stair, back up. New value: `exitOrStaircase: "none"`.
- **A floor with no exit ends its main path at its goal chest.** The chest is the terminal dead end, with no
  empty stub past it.
- **The floor-0 entrance does not become an exit.** The HUD back button already aborts an exploration from
  anywhere, as now.
- **Tombs follow the same rule.** Nothing else about tombs changes; they get their own redesign later.
- **A level completes only when the player leaves by that exit**, as completion already works.

## 3. Consequences

**Structural.** `exitOrStaircase` is structural (`world-spec-stability.md`), so every floor that loses its exit
re-carves: the 111 exits below floor 0 less wizard's 21 floor-1 main ends, 90 floors. Every floor that keeps its
exit stays byte-identical. Pre-release, so re-bake freely (check first for an uncommitted playtest bake).

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
change. If the stairhead check refuses one, it goes to the designer (Q8). The world's key solver (`worldGen/reachability.ts`) reasons about gates and keys, not exits, so it is
unaffected.

**Restore / high-water.** `repairFloorExploration.exitOf` already returns null for a floor with no exit (wizard
floor 0), so the chest carries the high-water mark below 0. Cover this with a test, not an assumption.

**Expedition flow.** Completion fires only on the one exit. A wing no longer completes the site, so a first visit
that goes into a wing completes when the player comes back up and leaves (Q5).

**Tests that freeze exits per floor today** (they change with the rule):

- `buildSite.spec.ts`: "leaving the last floor untouched", `floors[2]` is `"exit"`
- `validate.ts` + `validate.spec.ts`: "last floor … expected exit"
- `configBuilder.integration.verify.ts`: "every floor's main path ends in a real exit" (junior tomb)
- `lootEconomyInvariants.verify.ts:45`: a mainEndReward is required on exit floors, so extend it to `"none"`
- `stairTravel.spec.ts` / `assembleFloor.spec.ts`: `exitPos` stays the main path's terminal, so it still holds

## 4. Build plan

1. **Authoring value.** Add `"none"` to `exitOrStaircase` and its serializer. `buildSite` sets `"none"` on every
   floor reached by a side-section stairhead (wings, tomb floors, authored deeper floors). `validate.ts` requires
   exactly one exit per site, on the floor that ends the main chain. _Freezes:_ `buildSite.spec` (one case per
   branch) and `validate.spec` (an exit off the main chain is refused, a site with none is refused).
2. **Carve.** For `"none"`, the maze terminal is the goal and `mainRooms` writes no portal. _Freezes:_ a carve
   spec over made-up floors ("a floor ending at its chest carves exactly one portal, its entrance, and the chest is
   a dead end"), plus `cellSlot` (no `"exit"` slot). Then bake: generate-world, validate-world, the
   `worldFloorAssembly` sweep, tierFingerprints. Diff the result: every exit floor must be unchanged.
3. **Way-home check.** A reverse-reachability check over carved floors, with tests on made-up floors: a one-way
   into a pocket with no return is refused on a floor with no exit, and a wing stairhead behind a one-way is
   refused on the exit floor. Run it over the world and report any floor it refuses; never edit a lock to pass.
4. **Saves.** A `position` filed at a removed exit slot resumes somewhere valid. _Freezes:_ that resume test.
5. **Words and docs.** The pillar line (§5), `pyramid-interior-design.md`, the `buildSite.ts` comments, and the
   CHANGELOG `## Unreleased` line.

## 5. The glowing pillar

The exit is a `portal` with no `stairId`. `SiteMapView.tsx` (`kind === "exit"`) draws it as a free-standing
shaft of light: the `exit` prop tile (`art/masters/props/default/exit.webp`, default-tier art), with a lamp pool
at its foot. The prompt is `ui.prompt.exit` ("Leave this place"). No line explains it today.

**Where the line belongs.** In the room where the pillar stands, the first time the player reaches one, so
talk and walking alternate. The first pillar any player reaches is on starter_1 pyramid 1, floor 0, after Fez's
meeting in that floor's last room, so the line can be Fez's.

## 6. Decisions

- **Q1/Q2. The floor-0 entrance never offers leaving.** The one exit is at the main path's end; the back button
  aborts an exploration from anywhere.
- **Q3. Tombs follow the same rule.** Nothing else about tombs changes here.
- **Q4. Where the main path ends is the exit**, on whichever floor that is, a deeper one included. A floor with
  no exit ends its main path at its goal chest.
- **Q5. A level completes only when the player leaves by that exit.**
- **Q6. The stairs-up text stays as it is.**
- **Q7. The pillar is explained once, in its own room**, the first time the player reaches it (§5).
- **Q8. A lock floor the change refuses or breaks is reported to the designer**, never fixed by editing a `.lock`
  or moving or dropping content to make it pass.
