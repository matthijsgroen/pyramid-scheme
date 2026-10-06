# Stones on plates: acceptance criteria

For the engine session. The design is in `docs/game-design/lock-curriculum.md` ("Stones"); the tool side
(`yarn lock`, `src/game/lockNotation.ts`, `src/game/lockWalkSpec.ts`) already reads, walks and draws it.
Scope is the full proposal: stones, doors on several plates, and passages a stone cannot pass, with
stoneOnAPlate, twoStones, masonsRamp and counterweight all baking.

## The rules, in one place

- A **stone** rests on a plate or is in the player's hand. Nothing else: there is no loose stone.
- **Lifting a stone empties its plate**, so picking one up is a move that can open or shut a way by
  itself.
- **One stone in hand.** It is set down only on an empty plate.
- A **plate** is live. A way can open while it holds a stone (`-[p]-`) or while it holds none
  (`-[p:empty]-`), and follows it both ways, never latching. The player's own weight never presses a
  plate.
- A plate may open nothing: a shelf or a pedestal, somewhere to keep a stone.
- All plates look alike. A way shows the plates it waits for, and which state it wants.
- A gate owner may be a plate or `unladen` (empty hands), alongside levers and the rest, under `and` or
  `any`.
- **No swapping.** With a stone in hand, another stone cannot be lifted.
- **Some ways cannot be taken with a stone in hand:** a zipline, a narrow passage, a staircase and the
  way out. The first two are written in the lock as `-[unladen]-`; the stairs and the way out always take
  empty hands, so a stone never leaves its floor.

## 1. Contract

- [ ] The shared `Lock` holds
      `weights?: { plates: Record<id, { in: RegionId, stone: boolean, opens: { weighted: BarrierId[], empty: BarrierId[] } }> }`.
      Stones are alike and have no ids: a stone is authored as the plate it starts on (`stone: true`). A
      plate's `opens` has the same shape as a toggle's, keyed by the plate's two states.
      `mechanic-contract.md` gets a section for it, beside the other controls.
- [ ] Gate owners accept plate ids and `unladen`, on a gate between two regions or on a barred region.
- [ ] The engine refuses a lock where a gate needs stones on more plates than the lock has stones, where
      a plate stands in the region it would bar, or where a plate stands somewhere no corridor reaches.
      These are the refusals `parseLock` already makes.
- [ ] Every stone lock in `src/game/locks/` parses into a `Lock` the engine accepts without change.

## 2. Solver

- [ ] The engine's solver walks a stone arrangement as state: which plates hold a stone, and whether the
      hand holds one.
- [ ] For each stone lock in the catalogue, the engine's verdict (solvable, regions reached, dead ends)
      equals `yarn lock`'s. A shared fixture test pins this.
- [ ] Each stone lock fails the engine's solver when its load-bearing piece is taken away, as
      `lockCatalogue.spec.ts` already does for the tool.
- [ ] A floor is solvable from every arrangement the player can leave it in, so a return visit can never
      soft-lock.

## 3. Carve and bake

- [ ] Each plate is a node in its region.
- [ ] An `unladen` passage binds to a realisation like any gate (`mechanic-contract.md`, "Binding a
      realisation"): a zipline, or a **narrow passage**, which is a new realisation with its own art.
- [ ] On a floor with stones, binding a zipline or a narrow passage where the lock lets a stone through
      (no `unladen` on that passage) is refused. The art never decides what the walk sees; the binding
      makes it match.
- [ ] With the realisation mod off, the carve is identical: bare nodes, open corridors.
- [ ] The four stone locks and the stoneOnAPlate lesson bake on the dev floor (`src/worldGen/spec/dev.ts`),
      and the world bake stays byte-identical for every floor that has no stones.

## 4. Play

All through node actions (`node-actions.md`): arriving never acts, standing offers.

- [ ] On a plate holding a stone, with empty hands: **"Lift the stone"**. The plate's ways change at once,
      visibly: a way waiting for a stone shuts, a way waiting for an empty plate opens.
- [ ] On an empty plate, carrying: **"Set the stone on the plate"**. The same ways change back.
- [ ] No set-down is offered anywhere else, and no lift while already carrying.
- [ ] The explorer is drawn carrying the stone while it is in hand (see "The carrying explorer").
- [ ] A walk that crosses an `unladen` passage while carrying **stops on the near side** and says why
      ("Too narrow to carry the stone through"; a zipline: "You need both hands for the zipline").
- [ ] The way out and every staircase stop a carrying walk the same way: "Set the stone down first".
- [ ] A door held by plates shows its condition: which plates it waits for, whether it wants each one
      weighted or empty, and which already agree (`mechanic-contract.md`, "A gate shows its own
      condition").
- [ ] Plates and the stones on them are seen on the floor map from anywhere, once their room has been
      seen.

## The carrying explorer

New walking art, the same person in a new pose: **the stone hugged to the chest in both arms, the torch
tucked over the shoulder into the pack strap, still burning.** Both hands are full, which is what the
zipline line says.

- [ ] Three facings beside the plain ones in `src/assets/tiles/default/`: `explorer-carry-s-<n>`,
      `explorer-carry-n-<n>`, `explorer-carry-e-<n>`, at 40 × 70 and bottom-anchored like the plain set
      (`spritesheet-renderer-prep.md`, "The explorer"). West is east mirrored.
- [ ] `ExplorerDot` reads `sharedTileFrames("explorer-carry-<facing>")` while a stone is in hand. A facing
      with no carry art falls back to the plain explorer, so the mechanic ships before the art does.
- [ ] Walking and standing still use the carry frames the same way the plain frames work: the walk cycle
      runs on distance, and standing still shows frame 1.
- [ ] The light around the explorer does not change while carrying: the torch is still lit.
- [ ] The **Facings story** shows the carrying set beside the plain one at 1:1 and 3x, over limestone and
      granite. At 1:1 the stone reads as a stone, and the figure reads as the same person.
- [ ] Each carrying pose is kept large as `art/masters/explorer/explorer-carry-<facing>-<n>.webp`, and its
      import line is in `art/rebuild.sh`.

Make it by editing the walking sheet, not by drawing him again (`art/README.md`, "The explorer"). This
needs the large walking poses, which are made once.

```
yarn build-sheet /tmp/walk.png explorer-s explorer-n explorer-e --from=art/masters/explorer
# generator: the edit below, on /tmp/walk.png
yarn cut-sheet ~/Downloads/carry.png --out=/tmp/carry --rows=front,back,side --min=0.8
# keep each cut as art/masters/explorer/explorer-carry-{s,n,e}-<n>.webp, then import each:
yarn import-tile art/masters/explorer/explorer-carry-s-1.webp --tier=default --name=explorer-carry-s-1 --slot=explorer --filter=smooth
```

The edit:

```
Edit this sprite sheet. Keep the same character, outfit, palette, layout, spacing and number of frames,
and keep each frame's leg pose. Change only this: he carries a rough limestone block, about the size of a
large loaf, hugged to his chest in both arms, leaning back slightly under its weight. His lit torch is
tucked over his right shoulder into the pack strap, flame above his head. Same flat magenta background.
```

## 5. Save

- [ ] Where each stone lies is saved per floor, keyed by authoring address like other floor state, and
      survives leaving the floor and reloading the app.
- [ ] A stone in hand is saved too; a reload mid-carry resumes carrying.
- [ ] A save without stone state reads as the authored start arrangement. The field is additive; no
      reset.

## Done when

A player on the dev floor can take a stone to a plate and walk through its door. They can play
twoStones, masonsRamp and counterweight to the end, leave mid-way, and come back to every stone where
they set it.

## Not in scope

Pushing stones (rejected: a pushed stone can be cornered for good), throwing, stones as loot, stones that
travel between floors, a plate the player presses by standing on it.
