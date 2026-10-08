# Stones on plates: acceptance criteria

Built in phases; see the roadmap. The design is in `docs/game-design/lock-curriculum.md` ("Stones"); the
tool side (`yarn lock`, `src/game/lockNotation.ts`, `src/game/lockWalkSpec.ts`) already reads, walks and
draws it.
Scope is the full proposal: stones, doors on several plates, and passages a stone cannot pass, with
stoneOnAPlate, twoStones, masonsRamp and counterweight all baking.

## The rules, in one place

- A **stone** rests on a plate or is in the player's hand. Nothing else: there is no loose stone.
- **Lifting a stone empties its plate**, so picking one up is a move that can open or shut a way by
  itself.
- **One stone in hand.** It is set down only on an empty plate.
- A **plate** is live. A way can open while it holds a stone (`-[p]-`) or while it holds none
  (`-[p:empty]-`), and follows it both ways, never latching.
- **The explorer's weight presses a plate too**, while he stands on it (designer, 2026-10-06): the plate
  sinks and its ways move, which teaches that weight is what counts. It never lets him through: a plate
  and a way it opens are never one cell, so stepping off to reach the way lifts his weight and the way
  moves back. Only a stone holds a way while he walks through it, so the walk and the solver need no
  player-weight rule at all.
- A plate may open nothing: a shelf or a pedestal, somewhere to keep a stone.
- All plates look alike. A way shows the plates it waits for, and which state it wants.
- A gate owner may be a plate, in either state, alongside levers and the rest, under `and` or `any`.
- `unladen` is the narrow passage's keyword, not a condition to combine: it stands alone, `-[unladen]-`. A
  gate naming it beside another owner is refused by name (`unladenCombined`).
- **No swapping.** With a stone in hand, another stone cannot be lifted.
- **Some ways cannot be taken with a stone in hand:** every one-way (`>>`: a drop, a zipline), a narrow
  passage, a staircase and the way out. A narrow passage is written `-[unladen]-`; every one-way, the stairs
  and the way out take empty hands with nothing written, so a stone never rides a drop and never leaves its
  floor. `-[unladen]-` written on a drop's connection is refused by name: a drop already takes empty hands
  (`unladenOnDrop`).

## 1. Contract

- [x] The shared `Lock` holds
      `weights?: { plates: Record<id, { in: RegionId, stone: boolean, opens: { weighted: BarrierId[], empty: BarrierId[] } }> }`.
      Stones are alike and have no ids: a stone is authored as the plate it starts on (`stone: true`). A
      plate's `opens` has the same shape as a toggle's, keyed by the plate's two states.
      `mechanic-contract.md` gets a section for it, beside the other controls.
- [x] Gate owners accept plate ids, on a gate between two regions or on a barred region; `unladen` stands
      alone on a gate between two regions.
- [ ] The engine refuses a lock where a gate needs stones on more plates than the lock has stones, where
      a plate stands in the region it would bar, or where a plate stands somewhere no corridor reaches.
      These are the refusals `parseLock` already makes.
- [ ] Every stone lock in `src/game/locks/` parses into a `Lock` the engine accepts without change.

### Nested locks (designer, 2026-10-08)

A lock nested inside another sits on the outer lock's route. Which rule holds depends on which of the
two uses stones:

- **Pass through: the outer uses stones, the inner does not.** The player parks the stone in the outer
  lock, solves the inner one, goes back for the stone and carries it through the solved inner lock to use
  it beyond. So once solved, the inner lock is passable from in to out and back with a stone in hand: no
  `-[unladen]-` and no one-way stands on its route once it is solved.
- **Contained: the inner uses stones, the outer does not.** Every inner stone is in use; the player
  cannot leave the inner lock with a stone in hand (its way out takes empty hands, as a lock's way out
  always does).
- **Shared: both use stones.** The stones are one pool across both locks. A stone carried in from the
  outer lock may be set on an inner plate (stoneGate as the inner lock: walk in, set the stone in hand on
  its second plate, walk out); the player leaves the inner lock with a stone only by solving it for one.
  The inner lock's way out lets a stone through, because the outer lock still needs it; the floor's own
  ways out still take empty hands.
- [ ] The solver walks a nested floor with its stones as one pool and proves each case above; a nesting
      that breaks its rule is refused by name.

## 2. Solver

- [x] The engine's solver walks a stone arrangement as state: which plates hold a stone, and whether the
      hand holds one.
- [x] The engine's solver follows the same stone rules as the tool's walk (lifting, setting down, `:empty`,
      `unladen`, no stone down a one-way, past the stairs or the way out (the stairs down are the way out of a staircase
      floor; every staircase turns a carrying walk away in play)), each tested on a small made-up lock. No
      test pins a catalogue lock; `yarn lock` checks those.
- [ ] A floor is solvable from every arrangement the player can leave it in, so a return visit can never
      soft-lock.

## 3. Carve and bake

- [x] Each plate is a node in its region.
- [x] An `unladen` passage binds to a realisation like any gate (`mechanic-contract.md`, "Binding a
      realisation"): the **narrow passage**, a realisation with its own art.
- [x] A one-way binds to any one-way realisation on a floor with stones: every one-way takes empty hands in
      every walk and in play, so no binding can let a stone ride. The art never decides what the walk sees.
- [x] With the realisation mod off, the carve is identical: bare nodes, open corridors.
- [ ] The four stone locks and the stoneOnAPlate lesson bake on the dev floor (`src/worldGen/spec/dev.ts`),
      and the world bake stays byte-identical for every floor that has no stones.

## 4. Play

All through node actions (`node-actions.md`): arriving never acts, standing offers.

- [x] On a plate holding a stone, with empty hands: **"Lift the stone"**. The plate's ways change at once,
      visibly: a way waiting for a stone shuts, a way waiting for an empty plate opens.
- [x] On an empty plate, carrying: **"Set the stone on the plate"**. The same ways change back.
- [x] No set-down is offered anywhere else, and no lift while already carrying.
- [x] Standing on a plate presses it: the plate is drawn pressed and its ways move while the explorer
      stands there, and move back when he steps off.
- [x] A way held only by the explorer's weight is never on a route: the map draws it as it is while he
      stands on the plate, but route-finding treats it as it will be once he steps off, so a tap beyond it
      is not offered. Test: stand on a plate whose way is otherwise shut, and the cell behind that way is
      not walkable.
- [x] A plate has three looks: raised (empty, nobody on it), pressed (the explorer on it), and pressed
      with a stone.
- [x] The explorer is drawn carrying the stone while it is in hand (see "The carrying explorer").
- [x] A walk that crosses an `unladen` passage or reaches a one-way's launch while carrying **stops on the near side** and says why, in the one
      blocked line every such place uses ("Cannot pass with a stone"; designer, 2026-10-07).
- [x] The way out and every staircase stop a carrying walk the same way: "Cannot pass with a stone".
- [x] A door held by plates shows its condition: which plates it waits for, whether it wants each one
      weighted or empty, and which already agree (`mechanic-contract.md`, "A gate shows its own
      condition").
- [x] Plates and the stones on them are seen on the floor map from anywhere, once their room has been
      seen.

## The carrying explorer

New walking art, the same person in a new pose: **the stone hugged to the chest in both arms, the torch
tucked over the shoulder into the pack strap, still burning.** Both hands are full, which is what the
zipline line says.

- [ ] Three facings beside the plain ones in `src/assets/tiles/default/`: `explorer-carry-s-<n>`,
      `explorer-carry-n-<n>`, `explorer-carry-e-<n>`, at 40 × 70 and bottom-anchored like the plain set
      (`spritesheet-renderer-prep.md`, "The explorer"). West is east mirrored.
- [x] `ExplorerDot` reads `sharedTileFrames("explorer-carry-<facing>")` while a stone is in hand. A facing
      with no carry art falls back to the plain explorer, so the mechanic ships before the art does.
- [x] Walking and standing still use the carry frames the same way the plain frames work: the walk cycle
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

- [x] The arrangement is the weights mechanism's state in `journey.mechanismStates`, filed under the first
      plate's slot (`xplate:<id>`), which also saves a stone in hand, so there is no new field. It survives
      leaving the floor and reloading the app.
- [x] A stone in hand is saved too; a reload mid-carry resumes carrying.
- [x] A save without stone state reads as the authored start arrangement. The field is additive; no
      reset.

## Done when

A player on the dev floor can play **stoneGate** (`src/game/locks/stoneGate.lock`) to the end: lift the
stone off the altar, park a stone on the shelf, squeeze through the narrow passage, and spend both stones twice. They
can leave mid-way and come back to every stone where they set it. twoStones, masonsRamp and
counterweight play the same way.

## Not in scope

Pushing stones (rejected: a pushed stone can be cornered for good), throwing, stones as loot, stones that
travel between floors.
