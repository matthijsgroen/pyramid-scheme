# Playtest backlog

Merged work nobody has played yet. Each entry says where to go and what to look for; strike it when it has been
played, and open an issue or a task for anything that plays wrong.

## stoneGate phase 6 — Djoser

- **Pyramid of Djoser, pyramid 5 (develop mode to jump there).** The main floor opens on stoneGate among its own
  rooms and side paths: play it to the end and leave by the way out. Do the plates, the torch and the passage read
  at a glance on a full floor? Leave mid-way, take the ward wing's stair and come back down: every stone where you
  set it.
- **A save from before this release, standing inside that pyramid** (or the Valley of the Kings' last): it resumes
  at the entrance, with every room it had explored still explored.
- **A save that never ran the re-key release, standing in a re-laid pyramid:** its old coordinates are translated
  against the re-laid carve, so some explored rooms may come back unexplored or land on the wrong room; only its
  place is cleared. Rare (it skipped two releases); judge whether it needs more than that.

## stoneGate phase 4 — gate loops, nest spots

- **Dev journey, pyramid 12 (stoneGate).** Play it to the end: lift the stone off the altar (the back way opens, the
  door in shuts), park a stone on the backroom shelf, squeeze through the narrow passage, spend both stones twice,
  leave by the way out. Leave mid-way and come back: every stone where you set it.
- **The narrow passage on the loop.** Tap its wall from either side: the explorer walks to the nearer side and
  squeezes through from there (head-on behind the wall's face, or sideways along it), never round the loop first.
- **Nested stones (Storybook, `Topology/Lock playground`).** `Stone Passes Through`: park the stone, solve the lever
  inside, carry the stone through. `Stone Stays Inside`: the inner lock's door out opens only with its stone placed;
  carry the stone back out by its way in and in again — does a stone wandering into the outer lock read as fair?
  `Stones Shared`: carry the host's stone in, set it on the inner plate, take the inner's stone out to the door.

## stoneGate phase 3 — the narrow passage

- **Storybook, `Topology/Lock playground`, `SqueezeThrough`.** Tap the wall: the explorer walks beside it and "Squeeze
  through" shows; take it and the explorer squeezes through and stands on the far side. Tap the wall again to come
  back, so both directions. Lift the stone first: the explorer stops beside the wall and "Cannot pass with a stone" shows.
- **Storybook, `Topology/NarrowPassage`.** Both walls at 1x and 3x on two ranks, the explorer either side, the four
  squeezing headings. Judge the squeeze's size against the walking figure and whether drawing it in front of the
  wall reads.
- **The wall's fade while the explorer stands behind it:** it should fade to the occluder level, and stay solid while they
  squeeze through. Not seen live.
- **The `narrowAlong` wall** pokes slightly above the corridor top.
- **The squeeze's speed** (350 ms a leg) and its two legs at a corner: not seen live.
- **A zipline on a stone floor:** carry a stone to its launch: the explorer stops there and "Cannot pass with a stone"
  shows, as at the way out. Every one-way takes empty hands now, so no lock lets a stone ride a drop.
- **Tapping the wall when the near side is itself a node** skips that node's offer: the explorer walks onto it and the
  crossing is offered, not what stands there. Judge whether that reads.

## stoneGate phase 2 — playing with stones

- **Storybook, `Topology/Lock playground`, `twoStones`.** Lift a stone, set it on the vault plate, fetch the second,
  press both exit plates. Stand on an empty plate: it sinks and its door swings, and steps back when you leave.
  Carry a stone to the way out: the explorer stops and "Cannot pass with a stone" shows where the prompt would.
  Walk into the exit door: two stones on its face.
- **Same story, walking `twoStones` to the exit door.** The door face has not been seen live with the walk.
- **The vault door under the explorer's weight** (the `WeightOpensTheDoor` story): it should swing while the explorer
  stands on the plate. Not seen live.
- **The plate/stone icon on a door face** is taller than its 40px ring and clips it at the bottom; the designer
  chooses to fit it inside or crop it.
- **The explorer in the exit's light shaft while carrying** looks washed out; judge it.
- **Dev pyramid 11, floor 0.** The same lock in the game. Reload the app mid-carry: the explorer is still carrying it.

## #313 — forced tile steps, and region barriers as water or sand

- **Dev pyramid 4, the sluice.** A barred region drawn from outside as water: the cover fades in over two cells
  from each way in, and fades out in about a second when the lever opens it.
- **Dev pyramid 10, the procession.** Three pressure plates walked cellar, east, west; the cellar is reached by the
  zipline from the hall. Check that a tile cannot be walked round, that crossing east first spoils the run, and
  that the door onward shows the order and the way to reset.
- The water and sand textures are not painted yet: expect a flat fill.

## #315 — authoring locks in the world

- **expert_1 pyramid 4, floor 0** (the Valley of the Kings' last pyramid). The doubleBack: throw the levers,
  route the beam, drop from ledge to ledge to get back.
- **A north/south zipline** now takes one obstacle cell instead of three: the player at its launch and landing
  should stand right at the art.
- **Levers and ziplines at every difficulty.** A lever on a junior floor (junior_2 pyramid 2) should draw the
  painted lever, not the glyph alone.

## #304 — the story arrives

- Enter pyramids from each act (a starter, a junior, an expert, a wizard site) and read the arrival.
- Both languages: English and Dutch.
- Two speakers: the portrait and the bubble swap sides when the speaker changes.
- With tutorials turned off the arrival still plays.
