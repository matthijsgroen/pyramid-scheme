# Playtest backlog

Merged work nobody has played yet. Each entry says where to go and what to look for; strike it when it has been
played, and open an issue or a task for anything that plays wrong.

## The procession door

- **Lock editor, Carve and play, a lock with a procession door** (`P procession …`; the lesson `tilesInOrder` and `plates` carry a plain sequence). Walk a tile or two, open the door:
  are the walked bars free and the others greyed with their sign readable? Free every bar, solve the board: does
  the run start again and the reset appear? Walk the order it shows: does the door open? On a phone: does the board
  fit under the door's title, and can a bar be dragged?

## Every region stays reachable

- **expert_1 pyramid 4, floor 0** (the Valley of the Kings' last pyramid). doubleBack has a new zipline from s2
  (S2's chamber) back into s1 (S1's chamber). Solve it as before: does the drop back read as a way to s1, and does
  it make the lock too easy (throw S1 back, walk home by the right arm)? Does the floor still fit on screen?

## The torch and the flood

- **Storybook, Topology/Lock playground → Torch and flood.** Flood the hall: does the lit torch go out where you
  can see it? Drain it: does the torch read as unlit and offer to be lit? Light A and leave: does the door's face
  show the flame it wants and the one it wants out?
- **A lit torch in the dark.** In fog a lit torch differs from an unlit one only by its pool of light; the flame
  icon on its tile looks the same. Can you tell them apart? (Art question for the designer.)

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

- **Lock editor, Carve and play, `stoneGate`.** Play it to the end: lift the stone off the altar (the back way opens, the
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
- **Lock editor, Carve and play, `twoStones`.** The same lock in the game. Reload the app mid-carry: the explorer is still carrying it.

## #313 — forced tile steps, and region barriers as water or sand

- **Lock editor, Carve and play, `sluice`.** A barred region drawn from outside as water: the cover fades in over two cells
  from each way in, and fades out in about a second when the lever opens it.
- **Lock editor, Carve and play, a procession lock.** Three pressure plates walked cellar, east, west; the cellar is reached by the
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

- Every beat can be read first in Storybook, `Mods/Story/Beats`: arrivals, tomb scenes, bonds, readings, and the
  beats nothing fires yet, each with where it lands in the game and whether it needs a room in a level. Switch
  English and Dutch in the toolbar.
- In the game: set off for a journey from each act in Alle reizen and read its arrival.
- Two speakers: the portrait and the bubble swap sides when the speaker changes.
- With tutorials turned off the arrival still plays.

## The tomb: cave and cavern

- **Cavern floors 2 and 4, never played in the browser.** pitStair (floor 2) and throwItBack (floor 4, the
  expert-weight capstone): play both through to the pillar.
- **A stale starter_1 story bubble stays over the tomb screens** and blocks taps.
- **The revisited cavern's solved board** draws its bottom row oddly.
- **The cave-mouth fallback** in `CaveBackdrop` is crude until the painted art lands.
- **Tombs after the first in a tier** (e.g. `*_tomb_b`) deal different runtime boards than before: phantom tomb
  levels no longer reserve board indexes. Harmless with the release's save reset, but check a revisited
  `tomb_b` board.

## Camp art (`camp/scene-component`)

- Water spot before the well (junior to expert): the second jar stands far left, keeping the well's place, so the
  two jars look far apart. Left as is for now; a jar that shifts in until the well lands is the cheap fix.
- Layer flaws still open: the left seating stone has a notch under the pot's tripod leg (visible without the pot);
  oven, pavilion and astrolabe are tied to the bread board, second tent and star cloth only to hide repainted bits;
  the second palm's crown edge is ragged when it stands alone. Each wants a layer source.

## The camp release (`camp/home-and-loot`)

Play in Dutch on a phone width (390 px) and once on desktop (1440 px); develop mode (7 taps on "Kamp") has the
grants and jumps in settings. The full checklist with screenshots is `docs/review-camp-release.md`, "Look at in
browser".

- **Coming home.** Fresh save, Op pad, solve the first puzzle on side path 1 of Dageraad bij de Sfinx level 1 (the
  jar), tap ←: the coming-home screen shows the fire and the haul with the jar NIEUW; Uitpakken, and the jar
  stands by its spot. Does arriving home feel like a moment, and is the jar's tiny haul icon readable?
- **An empty haul.** Back out of a journey with nothing found: fire, rest panel, "Naar het kamp".
- **Hearts.** Take damage in an expert trap, tap ←: hearts are full on the coming-home screen, and `camp.rested`
  plays at the camp. Is walking home to heal an obvious choice when low?
- **Waterskins.** Hurt, solve a puzzle holding one (Vallei der Koningen floor 1, first puzzle up the main
  corridor): one heart back (two with pack-mule); at full health it is drunk for nothing. Does that sting?
- **A new chapter.** Finish the starter journeys until the junior key is held, go home: after the coming-home
  screen the new-chapter card, Later plays `camp.chapterJunior`. Once only.
- **Alle reizen.** From the card and from the map table (phone), the side panel (desktop): tiers newest first, the
  current journey NU, a finished tier folded with a dot when something waits, a locked tomb with "Kaartdelen: n van
  m", the chevron's stops. Is every journey one tap away, and is leaving one under way asked first?
- **Verzameling NIEUW.** Grant all treasures: the chest's badge, "Schatten · 40 nieuw", NIEUW slots; leave the tab
  and they clear, also after a reload. Should the opening story scene count as news on the first trip home?
- **Camp finds and parts.** The jar's popup shows its camp art and "<spot> · n van m"; a part (Dageraad bij de
  Sfinx level 2, first puzzle up the main corridor: the stone ring's sand bed) shows "Stenen kring · 1 van 2".
  Constructies lists started structures, parts only when a row opens. Finish the stone ring: `camp.structureDone`.
- **Story beats.** The starter tomb: `tombIntro` then the cave beat at the mouth, the pillar beat at the cave's
  exit, the cavern beat on level 2, Ipi's afterword only after the cavern. At camp: `camp.firstHome`,
  `camp.homeHaul` / `camp.homeEmpty`, `camp.firstFind`. Settings (develop mode) plays every draft per area.
- **Mosaic window.** "n van 252 stukjes", "k nieuw" and the bar once a piece is found; set them in by hand.
