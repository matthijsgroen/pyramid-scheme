# Tomb redesign — design

A tomb is **the end of a difficulty tier** and it is **hidden**: found through map pieces. This spec turns a
tomb from one plain pyramid into a journey of two levels — a cave, then a sunlit cavern with the pyramid in
it — and makes tombs authored with the same site vocabulary as pyramids. Brainstorm history:
`docs/handover-tomb-redesign.md`.

Scope of the build: the vocabulary for every tier, the **starter tomb** filled in. The other tiers' tombs get
their caves, caverns and locks with their own releases.

## 1. Journey shape

- A tomb journey has **two levels, two nodes on the map**: level 1 the cave, level 2 the cavern pyramid.
  `buildTombConfigs` emits `configs[tomb.id] = [caveSite, cavernSite]`; `TOMB_STRUCTURES.levelCount` is 2.
  The tomb's floor count moves to its own field (`floorCount`); the tableau grid, the validator,
  `TOMB_ROOMS_PER_FLOOR` and `levelSitesOf` read the real numbers instead of treating floors as levels.
- **One vocabulary for every site.** Each level is authored as a `PyramidConstraint` — floors, puzzles,
  traps, locks, difficulty, tileset — and built by the same `buildSite` path as a pyramid. The tomb branch that
  copies a subset of floor fields goes. `tomb()` adds only what is the tomb's own, as rules on top of an
  ordinary site: the ward key per floor (`wardPath`/`wardChest`), `tombTreasure`, and the tableau `runNr`,
  each set explicitly rather than derived from the floor index.
- **Per-level exterior.** A level carries `exterior` (`"caveMouth"`, `"cavern"`; pyramids keep theirs) and
  `board: false | levelSettings`. The journey-level `exterior` stays for the travel map card.
- **A level without a board** shows its exterior art with an Enter button and opens its interior; there is
  no number pyramid to solve.
- **No slide after a boardless level's site.** In `interiorComplete`, finishing the cave goes straight to the
  cavern's exterior. Between pyramid levels the slide stays.
- **Resume a completed journey at its last level.** A click on the journey card (outside the nodes) after the
  journey is complete resumes at the last level instead of level 1. For a tomb that skips the cave; for a
  pyramid journey with persistent interiors it lands at the last board. Before completion, resume works as
  now (`levelNr`), so after the cave a tomb resumes at the cavern.
- **Saves.** The cavern's keys move from `1:` to `2:`. The starter release resets saves
  (`docs/instructions/world-reshape-release.md`), so there is no migration.

## 2. Tileset, apart from difficulty

- A floor, a section and a room resolve a **tileset**: `section.tileset ?? floor.tileset ?? section.difficulty`. With
  no tileset authored, every site draws as today (byte-identical).
- The tileset picks **everything drawn** — the tiles and palette (`tileUrl`, `tierPalette`, rank mood) and the **encounter wall**:
  `EncounterModal` takes the room's tileset instead of `ctx.difficulty`. Difficulty picks the board only.
- (Named `tileset`, not `skin`: a floor's `theme` is already called its skin in the code.)
- New tileset: `cave`. Without its art it falls back to `placeholder/` tiles and the card colour behind
  encounters, as a rank without wall art does now.

## 3. Node difficulty and loot

- `NodeSelector` gains `difficulty`, resolved to `difficultiesByIndex` like `encountersByIndex`. It drives
  that room's board (family deal, board bucket) and nothing else: a room's loot tier is its section's, so a junior
  node on a starter path never pulls junior loot. The room is still drawn in its section's tileset.
- `loot: false` on a floor, a section and a node, inherited downward. It drops **generated** slots only —
  puzzle-room slots and `fragmentSlot` defaults. Authored rewards stay: `tombTreasure`, ward keys, chests.
- The cave ends in a chest with filler at the tomb's tier, and the cavern puzzles keep their loot slots; they fill
  when the pool allows and with camp supplies once that currency exists. `loot: false` stays in the vocabulary for content that must add no slots to a released
  tier (`src/data/tierFingerprints.spec.ts` guards that per tier).

## 4. Tableau key by family ordinal

- A tableau is keyed `(tomb, runNr, ordinal)`, where `ordinal` counts **tableau-family rooms** on the floor's
  main path, not `pathIndex`. One shared helper serves the hieroglyph plugin (generate and component), the
  world-gen key-requirement resolver, and the escalation position.
- In every tomb today the tableaus come first on the main path, so ordinal = `pathIndex` and the existing
  tableaus, their required fragments and the hieroglyph totals stay identical.
- Other rooms may now stand between tableaus.

## 5. The cave site (level 1)

- Exterior: a desert ridge with a cave mouth, no board.
- One site with 1..n floors, `tileset: "cave"`, `difficulty` the tomb's own tier. Starter: one floor.
- Puzzles on the main path at the **tomb's own tier** (starter: three). The lock is the tier + 1 step.
- **One floor lock per cave floor at tier + 1**, placed by name through the ordinary `locks`/`realisations`.
  Tier + 1 is how the lock feels in solve steps, not a code link — lock tier folders only classify:
  - starter cave → junior feel (1–3 actions per door), levers and doors (`toggle: "handle"`), several of each;
  - junior → expert (4–6), expert → master (combinations), master and wizard → wizard at its heaviest.
- The cave ends in a chest with filler loot; the player leaves by the pillar at the main path's end, the one exit.
- Story hooks: entering the cave, reaching the pillar. Lines are written in a story review pass.

## 6. The cavern site (level 2)

- Exterior: a vast cave with sunlight falling in, the pyramid standing in it. Board `levelSettings` sized as
  the next tier's (starter tomb: a junior-sized board); wizard uses wizard at its heaviest.
- Floors as today (starter: four), `difficulty` and `tileset` the tomb's tier.
- **Unchanged:** the tableaus in the same order with explicit `runNr`, each floor leading to its ward key;
  `tombTreasure`; the chest; the crocodile (junior and up); the tomb's own loot.
- **Added:** tier + 1 puzzles between the tableaus as `nodes: [{ where, encounter, difficulty }]`,
  and tier + 1 floor locks by name. Starter: locks on floors 2 and 4.
- Story hook: arriving at the cavern's exterior.

## 7. Art

Painted by the user through `yarn repaint`; prompts go in the repaint docs.

1. Cave-mouth exterior.
2. Sunlit cavern with its pyramid.
3. `cave` tileset tiles (floor and wall, the same set as a rank folder) and its palette.
4. `cave` tileset encounter wall.

## 8. Build order (starter release)

1. Capture a stability baseline (`generatedWorld.ts`, tableaus, tier fingerprints).
2. Uniform tomb authoring through `buildSite`, explicit `runNr`, tableau family ordinal. World byte-identical.
3. Tileset on floor, section and room; tiles and `EncounterModal` read it. World byte-identical.
4. `difficulty` and `loot` on `NodeSelector`; `loot` on floor and section. World byte-identical.
5. Per-level `exterior` and `board: false`; no slide after a boardless level; resume a completed journey at
   its last level.
6. Starter tomb as two levels: the cave with its lock and three puzzles, the cavern with locks on floors 2 and
   4 and junior puzzles between the tableaus. Write the three junior locks (Claude may write junior locks).
7. Bake, `yarn lock`, diff against the baseline.

## 9. Testing

- Unit tests on the vocabulary with made-up sites, never on authored locks or puzzles: tileset resolution
  (default and inheritance), tableau ordinal with another room between tableaus, `loot: false` dropping
  generated slots and keeping authored rewards, node difficulty in `RoomCell`, a boardless level continuing
  without a slide, resume at the last level.
- Steps 2–4 leave `generatedWorld.ts`, the tableaus and every tier fingerprint unchanged. After step 6 the
  starter fingerprint moves deliberately; every tableau's required fragments and the hieroglyph totals stay
  equal; no other tier's fingerprint moves.
- Gate in a clean worktree before pushing.
- In the browser: the cave from entry to pillar, the cut to the cavern with no slide, a junior puzzle on the
  starter wall, resuming via the map card. What cannot be played here goes to `docs/playtest-backlog.md`.

## Outside this spec

- **Release prerequisite: the loot economy.** Decided before the starter release, so the loot distribution
  stays stable from then on:
  1. mosaic piece counts;
  2. health drops (how much healing);
  3. inventory management (how much the inventory is used);
  4. decided: the cave ends in a chest and the cavern puzzles keep loot slots at the tomb's tier; their count is frozen at release.

  Once a tier is released its loot stays put; new content there that must not move it carries `loot: false`.
- Story lines for the hooks above.
- The other tiers' caves, caverns and locks, each with its release.
