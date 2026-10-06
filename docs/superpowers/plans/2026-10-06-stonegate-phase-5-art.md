# stoneGate Phase 5: Art — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Steps marked 🧑 are the designer's**: generating an image in Gemini by hand. An agent prepares everything before them and finishes everything after them, then stops and asks.

**Goal:** painted art for every piece stoneGate shows the player: a pressure plate (empty, and with a stone
on it), the torch (cold and lit), the narrow passage, and the explorer carrying a stone and riding a zipline.

**Architecture:** props go through the existing pipeline (`docs/instructions/prop-pipeline.md`). Blender
geometry (`scripts/renderProp.py`) makes a scaffold, mask and shadow. The designer repaints the scaffold in
Gemini from a prompt in `docs/instructions/repaint-queue.md` (`yarn repaint <tier/name>` copies it).
`yarn import-tile` cuts the return to the mask, and the master is kept in `art/masters/` with its import line
in `art/rebuild.sh`. The explorer's poses are edits of his walking sheet (`yarn build-sheet` → Gemini →
`yarn cut-sheet`); see `art/README.md`, "The explorer".

**Tech Stack:** Blender via `yarn render-prop`, Gemini (Nano Banana) by hand, sharp-based `yarn import-tile`,
`yarn build-sheet` and `yarn cut-sheet`, Storybook.

**Spec:** `docs/superpowers/specs/2026-10-04-stones-acceptance.md` ("The carrying explorer") and
`docs/superpowers/specs/2026-10-04-zipline-ride-acceptance.md` ("The ride art").
**Roadmap:** `docs/superpowers/plans/2026-10-06-stonegate-roadmap.md`.

## Global Constraints

- **Tier:** the props are painted for the **expert** rank first (`--tier=expert`), since Djoser and stoneGate
  are expert. That is the priest's material: dark basalt worn smooth, pale natron dust, bronze and old rope.
  The other ranks follow later as their own items. The explorer is shared art: `--tier=default`, never per rank.
- **Prompt rules:** from `repaint-queue.md` l.1-110 and `prop-pipeline.md` l.537-560:
  - background magenta `#FF00FF`;
  - frame named ("Portrait, two units wide by three tall… Do not re-compose it into a square");
  - every part named;
  - the material named;
  - "Keep every edge, every proportion…", and "do not change the angle";
  - one low lamp for light;
  - shadow `#3A342C`.
- **Take the master from Gemini's DOWNLOAD**, never a pasted image (`art/README.md`).
- **A redraw is a prompt edit in the doc plus `yarn repaint <key>`**, never a prompt pasted into chat.
- **A master's exposure is fixed in the master**, never with a colour flag at every import (`art/README.md`).
- **Code ships before art:** every draw path added in phases 2–3 must fall back to the placeholder or marker
  when a tile is missing. This plan only adds files and import lines; it changes no renderer code.

## Review Focus

1. **A flat thing on the floor has no silhouette** (`prim_mat`'s docstring). An empty plate risks reading as a
   floor tile. Its rim, and the dark gap around it, must survive at 56 units; check in the staging story.
2. **The plate with a stone and without must line up to the pixel.** They are two tiles swapped on one cell.
   The stone variant is the same render plus the stone, from identical parameters.
3. **Scale against the explorer (40×70):** the stone is "a large loaf", roughly 18–22 units wide at slot
   size. A stone the size of a chest reads as furniture.
4. **The cold and lit torch** (a brazier) must share their outline, so lighting it reads as a change of
   state and not of object.
5. **The explorer's carrying and riding frames** keep his face, outfit and palette: judge them in
   `Facings` beside the walking set at 1:1 and 3x.

---

### Task 1: The explorer carrying a stone

No geometry. The walking masters exist in `art/masters/explorer/`.

**Files:**
- Create: `art/masters/explorer/explorer-carry-{s,n,e}-<n>.webp`
- Create: `src/assets/tiles/default/explorer-carry-{s,n,e}-<n>.png`
- Modify: `art/rebuild.sh` (one import line per frame)
- Modify: `src/app/SiteMap/ExplorerDot.stories.tsx` (`Facings` shows the carrying rows below the walking rows)

- [ ] **Step 1: Build the sheet to edit**

Run: `yarn build-sheet ~/tile-previews/explorer-walk.png explorer-s explorer-n explorer-e --from=art/masters/explorer`
Expected: `sheet → ~/tile-previews/explorer-walk.png`, three rows, magenta.

- [ ] **Step 2: 🧑 Generate.** Attach `~/tile-previews/explorer-walk.png` in a new Gemini chat with this
prompt (also in the stones spec), and save the DOWNLOAD as `~/Downloads/explorer-carry.png`:

```
Edit this sprite sheet. Keep the same character, outfit, palette, layout, spacing and number of frames,
and keep each frame's leg pose. Change only this: he carries a rough limestone block, about the size of a
large loaf, hugged to his chest in both arms, leaning back slightly under its weight. His lit torch is
tucked over his right shoulder into the pack strap, flame above his head. Same flat magenta background.
```

- [ ] **Step 3: Cut and keep the masters**

Run: `yarn cut-sheet ~/Downloads/explorer-carry.png --out=/tmp/carry --rows=front,back,side --min=0.8`
Expected: a frame count per row. If a row has more frames than the walking set (front 2, back 4, side 4),
keep the first ones in order. If it has fewer, stop and ask the designer.

For each kept frame, write the master on the magenta background at quality 92, matching the walking
masters. Use this one-off script, run with `yarn tsx` from the repo root:

```ts
import sharp from "sharp"
const map: [string, string][] = [["front-1", "explorer-carry-s-1"], ["front-2", "explorer-carry-s-2"], ["back-1", "explorer-carry-n-1"], ["back-2", "explorer-carry-n-2"], ["back-3", "explorer-carry-n-3"], ["back-4", "explorer-carry-n-4"], ["side-1", "explorer-carry-e-1"], ["side-2", "explorer-carry-e-2"], ["side-3", "explorer-carry-e-3"], ["side-4", "explorer-carry-e-4"]]
for (const [cut, name] of map)
  await sharp(`/tmp/carry/${cut}.png`).flatten({ background: "#ff00ff" }).webp({ quality: 92 }).toFile(`art/masters/explorer/${name}.webp`)
```

Then compare its exposure with the walking masters: `yarn build-sheet /tmp/check.png explorer-e explorer-carry-e --from=art/masters/explorer --scale=0.5`.
If the carrying row is visibly darker or redder, fix it in the masters (a gamma on the RGB channels, as
`art/README.md` records for the side row), never with an import flag.

- [ ] **Step 4: Import, and record**

For each master:

```sh
yarn import-tile art/masters/explorer/explorer-carry-s-1.webp --tier=default --name=explorer-carry-s-1 --slot=explorer --filter=smooth
```

Append every line to `art/rebuild.sh` under a `# THE EXPLORER, CARRYING` heading.

- [ ] **Step 5: Stage it.** In `ExplorerDot.stories.tsx` `Facings`, add rows for
`sharedTileFrames("explorer-carry-<facing>")` under the walking rows, west mirrored as for walking. Run
`yarn storybook`, open `Facings`, and show the designer a screenshot at 1:1 and 3x over limestone and
granite. **Stop for the designer's verdict.**

- [ ] **Step 6: Commit**

```bash
git add art/masters/explorer src/assets/tiles/default/explorer-carry-* art/rebuild.sh src/app/SiteMap/ExplorerDot.stories.tsx
git commit -m "art: the explorer carrying a stone"
```

---

### Task 2: The explorer riding a zipline

Same as task 1, one pose per facing (`docs/superpowers/specs/2026-10-04-zipline-ride-acceptance.md`).

**Files:**
- Create: `art/masters/explorer/explorer-zip-{s,n,e}.webp`
- Create: `src/assets/tiles/default/explorer-zip-{s,n,e}.png`
- Modify: `art/rebuild.sh`, `src/app/SiteMap/ExplorerDot.stories.tsx`

- [ ] **Step 1:** `yarn build-sheet ~/tile-previews/explorer-one.png explorer-s-1 explorer-n-1 explorer-e-1 --from=art/masters/explorer`
- [ ] **Step 2: 🧑 Generate** with the prompt in the zipline spec ("The edit"), and save the DOWNLOAD as
  `~/Downloads/explorer-zip.png`.
- [ ] **Step 3:** run `yarn cut-sheet ~/Downloads/explorer-zip.png --out=/tmp/zip --rows=front,back,side --min=0.8`, then keep
  `front-1`, `back-1` and `side-1` as `explorer-zip-s`, `explorer-zip-n` and `explorer-zip-e`, with task 1's
  script and exposure check.
- [ ] **Step 4:** import each with `--tier=default --name=explorer-zip-<f> --slot=explorer --filter=smooth`,
  and append the lines to `art/rebuild.sh`.
- [ ] **Step 5:** add a `Riding` row to `Facings`. Screenshot it, and **stop for the designer's verdict.**
- [ ] **Step 6:** commit with `art: the explorer riding a zipline`.

---

### Task 3: The pressure plate, empty and with a stone

**Files:**
- Modify: `scripts/renderProp.py` (new `prim_plate`, registered in `PRIMITIVES` as `"plate"`)
- Modify: `docs/instructions/repaint-queue.md` (entries `expert/plate` and `expert/plateStone`)
- Create: `art/masters/props/expert/plate.webp`, `plateStone.webp`; `src/assets/tiles/expert/plate.png`, `plateStone.png`
- Modify: `art/rebuild.sh`
- Create: `src/app/SiteMap/Plate.stories.tsx` (staging, in the style of `Lever.stories.tsx`)

- [ ] **Step 1: Geometry.** Add `prim_plate` to `scripts/renderProp.py`, beside `prim_mat`:

```python
def prim_plate():
    """A pressure plate set into the paving: one square slab, raised a finger's width, with a dark gap all
    round it where it can sink. --contents=stone puts a rough limestone block on it.

    A FLAT THING ON THE FLOOR HAS NO SILHOUETTE (`prim_mat`), so what makes this a plate and not a floor
    tile is the GAP: a VOID ring proud of the paving, wide enough to survive at 56 units, and the slab
    standing a little above it. Not spun: like `pit`, it is cut into the paving and must agree with it.
    The stone variant is the same render plus the block, so the two tiles swap on one cell to the pixel."""
    mark(box(0.78, 0.78, 0.02, z=0.01), VOID)          # the gap the slab sinks into
    box(0.66, 0.66, 0.06, z=0.04)                       # the slab, standing proud of the gap
    if arg("contents") == "stone":
        stone = box(0.34, 0.26, 0.22, z=0.07 + 0.11)    # a large loaf: wide, shallow, waist-low at most
        stone.rotation_euler = (0, 0, math.radians(12))  # set down by hand, never square to the slab
        bpy.ops.object.transform_apply(rotation=True)
        # Plain stone material: "accent" is the file's ochre, kept for flame (`prim_brazier`).
    return join_all()
```

Register it: add `"plate": prim_plate,` to `PRIMITIVES.update(…)` (`renderProp.py` ~l.3487).

**Gate: look at the mesh, then at the numbers.**

```sh
yarn render-prop --primitive=plate --preview=1 --width=600 --height=450
yarn render-prop --primitive=plate --contents=stone --preview=1 --width=600 --height=450
yarn render-prop --primitive=plate --colour=#a7b2be --floor=#8d98a5
```

Read the printed "lands at WxH map units" line against the explorer (40×70). The empty plate should land
wide and low, about one cell (56) across. With the stone, the block should be about 18–22 wide. If it lands
outside that, adjust the box sizes and re-render. The colours are the expert rank's, taken from the
`dropNorth` scaffold line in `repaint-queue.md`.

- [ ] **Step 2: Scaffolds, masks and shadows**, for each variant (no `--contents`, and `--contents=stone`):
three renders from identical parameters, following `prop-pipeline.md` "Step 2":
- the plain render saved as `~/tile-previews/plate-expert.png` (`plateStone-expert.png` for the stone);
- `--shadow=0 --background=none` for the object mask;
- `--only=shadow` for the shadow.

Copy the exact flags of an existing `scaffold` line in `repaint-queue.md`.

- [ ] **Step 3: Queue entries.** Add `### \`expert/plate\` — a pressure plate set into the floor` and
`### \`expert/plateStone\` — the plate, a stone resting on it`, each with:
- an **Attach** list: the scaffold and `~/tile-previews/expert-plain.png`;
- the prompt below;
- the `scaffold …` line and the `yarn import-tile …` line, with `--tier=expert --slot=prop --filter=smooth --mask=… --seat=…`.

Use `--name=plate` and `--name=plateStone` respectively.

`expert/plate`:

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF.

Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.

The object: a PRESSURE PLATE set into a tomb floor, seen from above. One square SLAB of dark basalt stands a
finger's width above the paving, its top worn smooth and slightly dished in the middle where it has been
stepped on for centuries. All round it runs a narrow black GAP, the slot it sinks into: a clean dark line on
every side, unbroken, that says this slab moves. No carving, no glyph and no handle on it.

Basalt worn dark and faintly polished on the slab's top, with pale natron dust settled into the gap and into
the slab's corners.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

Light it as one low lamp in a closed tomb. The slab's raised near edge may CATCH it; the gap stays the
darkest thing in the picture.

The shadow is part of the picture: paint it #3A342C, with no pink and no purple in it at all.

No ground plane and no background: the object stands alone on the magenta. The priest's tomb: dark basalt worn smooth, pale natron dust settled into every crack, bronze and old rope gone dull with age. No gold at this rank — stone, dust and rope.
```

`expert/plateStone`: the same prompt, with this sentence after the gap sentence: `On the slab rests one
rough block of pale LIMESTONE, about the size of a large loaf, set down at a slight angle: chisel-marked,
chipped at one corner, much paler than the basalt under it.` Add to the material paragraph:
`The limestone is cream and chalky, dusty, its edges knocked round.`

- [ ] **Step 4: 🧑 Generate** both: `yarn repaint expert/plate`, paste into a new Gemini chat with the two
  attachments it reveals, and save the DOWNLOAD. Then the same for `yarn repaint expert/plateStone`.

- [ ] **Step 5: Import and gate.** Run each queue entry's `yarn import-tile` line, then
  `yarn tile-stats src/assets/tiles/expert/plate.png --tier=expert --slot=prop`. Keep each master under
  `art/masters/props/expert/` and add its line to `art/rebuild.sh`.

- [ ] **Step 6: Stage it.** Create `src/app/SiteMap/Plate.stories.tsx`, titled `Topology/Plate`, built like
  `Lever.stories.tsx`: the expert floor, one cell with `plate`, one with `plateStone`, and the explorer beside
  them for scale, at 1:1 and 3x. Screenshot it, and **stop for the designer's verdict** on review-focus items
  1–3.

- [ ] **Step 7: Commit** with `art: the pressure plate, empty and with a stone`.

---

### Task 4: The torch, cold and lit

`prim_brazier` already has a cold variant and a `--lit` one. The torch reuses it, unless the designer wants
a standing torch instead.

- [ ] **Step 1: Ask the designer:** "The torch (activator) as the existing brazier, cold and lit, or a new
  standing torch?" Continue with the brazier unless they choose otherwise. A standing torch is a new prim,
  built the way task 3 builds one.

**Files:**
- Modify: `docs/instructions/repaint-queue.md` (entries `expert/torchCold`, `expert/torchLit`)
- Create: masters and tiles `torchCold`, `torchLit` (expert); `art/rebuild.sh`
- Create: `src/app/SiteMap/Torch.stories.tsx` (`Topology/Torch`)

- [ ] **Step 2: Scaffolds.** Render `--primitive=brazier` without `--lit` (cold) and with `--lit=1`, with the
  identical parameters and the three renders each, as in task 3 step 2. Check that the outlines match
  (review focus 4): overlay the two masks.
- [ ] **Step 3: Queue entries**, from the brazier's existing entries if `repaint-queue.md` has one
  (`grep -n brazier docs/instructions/repaint-queue.md`), at the expert rank. Cold: "cold grey ash in the
  dish, one unburnt stick across the rim". Lit: "a small steady flame rising from the ash, ochre and
  orange, the only warm colour in the picture".
- [ ] **Step 4: 🧑 Generate** both with `yarn repaint expert/torchCold` and `yarn repaint expert/torchLit`.
- [ ] **Step 5: Import, gate and record**, as in task 3 step 5.
- [ ] **Step 6: Stage** in `Topology/Torch`: cold and lit side by side, with the explorer. Screenshot it, and
  **stop for the verdict.**
- [ ] **Step 7: Commit** with `art: the torch, cold and lit`.

---

### Task 5: The narrow passage

**Blocked on phase 3's decision:** whether the narrow passage is drawn as art across the corridor (like the
zipline's `dropEast`/`dropNorth`/`dropSouth`, chosen by direction) or as a door room. Do not start until
phase 3's plan records it.

- [ ] **Step 1:** read phase 3's decision. If it is cell art by direction, the tiles are
  `expert/narrowEast` (west is it mirrored), `expert/narrowNorth` and `expert/narrowSouth`, drawn the way
  `DROP_ART` draws the drops (`src/app/SiteMap/nodeArt.ts:132`).
- [ ] **Step 2: Geometry.** Add a `prim_narrow` that takes `--contents=east|north|south`: two rough basalt
  JAMBS pinching the corridor to a slot about a third of its width, a fallen block wedged high between them,
  and nothing on the floor. A person passes sideways, and a stone does not. Gate it as in task 3 step 1: the
  slot must read at 56 units.
- [ ] **Steps 3–7:** queue entries, generation 🧑, import, staging in `Topology/NarrowPassage` (each
  direction, with the explorer passing), and commit, following task 3.

---

## Self-review notes

- **Spec coverage:** "The carrying explorer" is task 1. The zipline's "ride art" is task 2. The plate and
  stone for §4 Play are task 3. The torch, for stoneGate's activator, is task 4. The narrow passage, for §3
  Carve, is task 5.
- **Not here:** wiring the tiles into the renderer is phases 2 (plate, explorer carrying), 3 (narrow
  passage) and the zipline glide phase (riding frames). The torch's tiles are wired when the torch family
  gets `drawing.art`. That is a small follow-up, recorded in `docs/instructions/art-tasks.md` §9.

---

### Task 6: The sequence tile

**Decided by the designer (2026-10-06):** the sequence tile and the pressure plate are two distinct objects,
so the player never confuses them:
- **sequence tile:** stepped on in order. A flush floor tile set into the paving, with a plain top on which
  the renderer draws the glyph.
- **pressure plate:** takes a stone. A raised slab with a dark gap all round, with no glyph (task 3).

Today the sequence tile is a vector slab with a text glyph (`PlateShape`, `src/app/SiteMap/nodeShapes.tsx`),
coloured by `plateLook` (`src/app/SiteMap/plateLook.ts`). It has three states: `unwalked`; `inOrder`, with a
tick; and `outOfOrder`, with a cross.

**One painted tile serves every glyph and every state.** The painted tile has a PLAIN top surface: no
recess, no carving, no glyph. The renderer draws the glyph on it in the floor's own projection, so it reads
as lying on the tile (inlaid or painted), not floating over it. The state is the glyph's colour (designer,
2026-10-06):
- **dark** when the tile has not been walked;
- **light blue** when it was walked in order;
- **red** when it was walked out of order.

No tick and no cross (designer, 2026-10-06): the colour is the state. Red and light blue sit on the
blue–yellow axis that most colour blindness keeps, so pick the two far apart in lightness as well. Remove
the tick and cross paths from the shape.

**Names:** the code calls the sequence tile a "pressure plate" (`PlateShape`, `plateLook`, the "plate" shape
kind), while phase 1 adds `RoomCell.plate` for the stones' plates. When this task wires the art, rename the
sequence tile's drawing to `SequenceTileShape` / `sequenceTileLook`. Keep the shape kind's string if renaming
it touches saves or fixtures, and say so.

**Files:**
- Modify: `scripts/renderProp.py` (a `prim_sequencetile`: a square slab set FLUSH in the paving, about 0.8 of
  a cell, with a fine incised border and a plain flat top. Not spun, like `pit`, so it agrees with the
  paving.)
- Modify: `docs/instructions/repaint-queue.md` (`expert/sequenceTile`)
- Create: master, tile and `art/rebuild.sh` line (`--tier=expert --name=sequenceTile --slot=prop` or a floor
  slot; pick the slot whose seating lets a flush tile lie on the floor, and check `importTile.ts` SLOTS)
- Modify: `src/app/SiteMap/nodeShapes.tsx` (draw the painted tile under the glyph via `tileOrPlaceholder`,
  falling back to today's vector slab; the glyph on the tile's top face in the floor projection, coloured by
  state from `sequenceTileLook`), plus the rename above
- Test: the existing `nodeShapes` or `sequence` render tests must stay green. Add one test that the glyph
  still renders over the painted tile.

- [ ] **Step 1: Geometry**, gated as in task 3 step 1. It must read as part of the floor at 56 units, not as
  a raised object: the opposite of the pressure plate.
- [ ] **Step 2: Scaffolds, masks and shadows**, as in task 3 step 2.
- [ ] **Step 3: Queue entry** `### \`expert/sequenceTile\` — a carved floor tile, stepped on in order`. The
  prompt names: a square basalt tile flush with the paving; a fine incised border; a PLAIN, flat, smooth
  top surface with nothing carved or painted on it ("leave the top plain: a sign is added later"); worn
  smooth where feet have crossed; natron dust in the border line. Same rank material and light lines as task 3.
- [ ] **Step 4: 🧑 Generate** with `yarn repaint expert/sequenceTile`.
- [ ] **Step 5: Import, gate and record**, as in task 3 step 5.
- [ ] **Step 6: Wire it** in `PlateShape` → `SequenceTileShape`, TDD for the glyph-over-tile test, and
  stage it in `nodeShapes.stories.tsx` (or the sequence story, if one exists) in all three states, with the
  explorer for scale. Screenshot it, and **stop for the designer's verdict.**
- [ ] **Step 7: Commit** with `art: the sequence tile, carved into the floor`.
