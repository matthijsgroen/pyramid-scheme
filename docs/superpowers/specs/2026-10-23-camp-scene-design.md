# The camp scene: design

The home screen becomes the camp (`docs/game-design/camp.md` §3–4). This document covers one piece of
that: **`CampScene`, the React component that draws the camp** for any chapter and any number of finds,
at any container size, so it can be tested completely in Storybook before it is wired into the game.

Settled with the designer on 2026-10-23. Look and feel: the impressions in the
[Kamp schetsen canvas](https://claude.ai/artifact/TJWJCGKWWPbmQUPgT6BwVp) (`ImpressieBeginner` …
`ImpressieTovenaar`). Clickable layout prototype: [Kamp scène prototype](https://claude.ai/artifact/ASVzctuASBaLPYP3fopob5)
(private to the owner; its `layout()` function is the reference for the numbers below). This is a
design, not a plan: it says what holds and leaves the code to the implementer.

## Why

The camp is the one screen the player sees between every trip, and the place where progress shows:
pyramids on the horizon, a camp that fills up find by find. It has to look like the impressions on a
portrait phone and on a wide desktop pane, and every chapter and every partial state has to be
reviewable without playing to it.

## Goals

- One component draws the camp scene from data alone: the chapter reached and the step count per spot.
- It fills any container: a portrait phone, a tablet, the wide pane beside the desktop journey list.
- Every state is a Storybook story: each chapter empty and full, partial camps, several container sizes.
- Real painted art, generated in small pieces and composed in code.
- Living firelight.

## Non-goals

- The HUD (hearts, coins), "Op pad", "Alle reizen", the popups. They sit around or over the scene and
  are separate components.
- Coming home and unpacking (`camp.md` §3 "Coming home"): animating a new piece in. The scene only has
  to draw a state; a later piece animates between two states.
- The camp-loot currency, world generation, saves. The scene takes numbers; where they come from is the
  integration's job.
- Generating the art. This document fixes what pieces exist and how they are composed; the prompts and
  the generate/import loop are a separate art brief.

## Anti-goals

- **Placeholders in the game.** `camp.md`: a spot is empty sand until something stands there. No dotted
  outlines, no "?" slots, no greyed-out future items.
- **Baked light.** Light painted into a background stops lining up the moment the layout moves. All warm
  light comes from code.
- **A cropped camp.** At no container size is an occupied spot cut off by the edge.
- **A different camp per device.** Phone and desktop show the same camp with the same spots in the same
  order; only the spacing differs.

## What the player sees

**Always night.** A deep blue sky with stars and a crescent moon top left, a purple band low at the
horizon, dunes, warm sand. The time of day never changes; a new chapter is shown by its pyramid, not by
a different hour.

**The horizon carries the chapters.** One pyramid per chapter reached: beginner one, wizard five, the
last one with a golden capstone. They stand on the far dunes, behind the camp.

**The camp in front.** The fixed objects are there from the very start: the chest, the stained-glass
window and a small campfire. The 12 spots of `camp.md` "Camp loot" fill in around the fire as steps are
found.

**The light comes from the scene.** The campfire throws a warm pool over the sand, the window spills
coloured light on the sand in front of it, the chest glows gold from inside. Later pieces that burn (the
clay oven, the lookout's signal fire) bring their own small glow.

## Composition

### Layers, back to front

1. **Sky**: a CSS gradient plus stars and moon. Stretches to any height without a seam.
2. **Horizon**: the far dunes as a horizontally repeating strip, with the pyramids placed on it.
3. **Ground**: sand, a seamless repeating texture, from the horizon down to the bottom edge.
4. **Camp**: every piece of every occupied spot, plus the chest and the window, sorted by depth so a
   nearer piece overlaps a farther one.
5. **Light**: the glows, blended over layers 3 and 4.
6. **Entrances**: the chest, the window and (once it exists) the map table as buttons, each with a visible
   label and an optional badge. A hit area covers its whole object and is at least 44×44 px however small
   the object is drawn; two hit areas never overlap (they shrink toward their own object, not below 44, and
   otherwise move apart sideways). A label is never set below 11 px.

### Spots as anchors, placed as in the impression

Every spot, and the chest, window and campfire, has an **anchor**: the bottom centre of its object group.
Its place is its offset from the fire pit's anchor as measured in the wizard impression (1438×2576 px),
in object units `u` (1u = 326 px there, the chest being 0.83u wide in 271 px). x runs right, y runs down;
a smaller y stands farther away. A spot never has a fixed pixel position. These are starting values, tuned
by eye once art lands:

| Spot / piece | x     | y     |
| ------------ | ----- | ----- |
| lookout      | -1.62 | -1.89 |
| sleeping     | -0.57 | -2.41 |
| star canopy  | 0.65  | -2.79 |
| palm garden  | 1.61  | -1.62 |
| cooking      | -0.45 | -1.14 |
| fire         | 0     | 0     |
| water        | 1.10  | -0.94 |
| donkey       | -1.46 | -0.39 |
| camel        | 1.55  | 0.13  |
| ibis pond    | -0.98 | 1.83  |
| map table    | 0.80  | 0.92  |
| god statues  | 1.33  | 1.87  |
| chest        | -1.52 | 0.40  |
| window       | 0.91  | -1.92 |
| campfire     | 0     | 0     |

The impression's horizon is at y = -4.07.

Every spot also has a **frame** and a **footprint**, both in object units. The frame is the side of the
square its step images are drawn at; the footprint is the width the object stands on. They are measured
from the wizard impression against the chest (271×226 px there, its art filling 0.83×0.76 of its frame):
an object w×h px is w/271·0.83 wide and h/226·0.76 tall, its footprint is that width, and its frame is the
larger of the two over 0.9, the share of its square that spot art fills. Re-measured when a spot's art
lands. Starting values:

| Spot        | frame | footprint |
| ----------- | ----- | --------- |
| lookout     | 2.31  | 0.87      |
| sleeping    | 1.53  | 1.38      |
| star canopy | 1.12  | 1.01      |
| palm garden | 2.51  | 1.07      |
| cooking     | 1.89  | 1.70      |
| fire        | 1.91  | 1.72      |
| water       | 1.21  | 0.91      |
| donkey      | 1.49  | 1.34      |
| camel       | 1.46  | 1.19      |
| ibis pond   | 2.46  | 2.21      |
| map table   | 1.67  | 1.50      |
| god statues | 1.80  | 1.62      |
| chest       | 1     | 0.83      |
| window      | 1.4   | 0.55      |
| campfire    | 1     | 0.45      |

The window stands 1.35× the chest's height in the impression; its frame of 1.4 draws it at that.

### Size and spacing are two separate things

- **Size** (`u`) is the largest at which the chapter's frame fits the inset-free container at the
  minimum stretch, capped by the chapter's camera height. A tent takes the same share of the screen's
  height on a phone and on a desktop while the width allows it.
- **Spacing** is elastic in both directions. A spot's screen position is the fire's anchor plus
  (x·sx·u, y·sy·u), where `sx` and `sy` are stretch factors, each within its range. Once `u` is set, `sx`
  grows to use the spare width and `sy` the spare height between the lowest horizon (plus far sand) and
  the bottom, each up to its maximum: a desktop pane spreads sideways, a tall phone spreads downward. Past
  the maxima only empty desert grows. A stretch scales every offset alike, so every spot keeps its order in
  x and in y on any container.
- **Depth**: the drawing scale runs from 0.9 at the catalogue's farthest anchor to 1 at its nearest, so a
  spot keeps its size across chapters. Pieces are drawn in order of their anchor's y, the farthest first.
- **Overlap**: spots whose anchors are within 0.35u in y stand at the same depth, and at the minimum
  stretch their footprints never overlap (mean footprint times a gap factor of 1, centre to centre); when
  the impression's offsets are too close for that, the minimum `sx` rises until they are apart. Spots at
  different depths may overlap, as in the impression: the nearer one is drawn over the farther one.
- **When the width runs out, the objects shrink** (my call). A portrait phone at wizard is width-bound:
  objects get smaller and `sy` takes the spare height. No-crop always holds.

### Starting numbers

All in object units `u` (the chest is 0.83u wide):

| What                                          | Value                               |
| --------------------------------------------- | ----------------------------------- |
| stretch sx and sy                             | 0.85 – 1.6 each                     |
| same depth                                    | anchors within 0.35 in y            |
| gap factor between same-depth footprints      | 1                                   |
| depth scale farthest / nearest anchor         | 0.9 / 1                             |
| far sand between horizon and the farthest top | at least 0.5                        |
| minimum sky above the horizon                 | 1.7                                 |
| lowest horizon, share of height               | 0.27 from the top                   |
| insets top / bottom (px, phone)               | 56 / 96 (HUD; safe area + "Op pad") |
| padding below the nearest anchor              | 0.35                                |
| side margin of the frame                      | 0.15 each side                      |
| camera height per chapter                     | 4.2 / 4.8 / 5.4 / 6.0 / 6.6         |

`u = min(H / cameraHeight, H / frameHeight(sy min), W / (frameWidth(sx min) + margins))`, then `sx` and
`sy` are solved from what is left and clamped. At 390×844 with the phone insets, wizard comes out at
u ≈ 65 px, width-bound: the window beside the palm garden (0.30u apart in y) sets the minimum `sx` at
about 1.07.

### The camera zooms out per chapter

Each chapter has a **frame**: the bounding box of the frames of the spots that chapter can hold and of the
chest, window and campfire, at their positions, plus the minimum sky above. The horizon stays above the
farthest frame top by at least the far sand. Beginner sits close to the fire; each later chapter takes one step out; wizard frames the whole
camp. The frame is fitted into the container without cropping it:

- spare height above the frame is filled first with **far sand**: the horizon never sits lower than a
  fixed share of the height (about a quarter from the top, as in the impressions), so the gap between
  the dunes and the camp grows instead of the sky. Only when the camp itself reaches that line does the
  horizon go up further;
- spare width beside the frame is filled with sand and dunes;
- the frame is never cut.

Spots keep their place in the impression when a chapter is added: the camera zooms out to reveal ground
where the new spots will stand. A new chapter can change the stretch, never the order of the spots.

A spot that belongs to a later chapter than the current one is not drawn. A spot of the current chapter
with zero steps is not drawn either. Both are just sand.

### Steps are pieces

Each step of a spot (the list in `camp.md` "Camp loot", in order) is **one piece**: the whole spot as it
looks at that step, one square image (`src/assets/camp/<piece id>.webp`, see `camp-art-prompts.md`). A piece has:

- its frame: the spot's square frame, anchored bottom-centre on the spot (`dx = dy = 0`);
- the id of the previous step's piece in `replaces`, so only the latest step of a spot is drawn (the fire
  pit's first step also replaces the fixed campfire);
- optionally a list of **lights**: offset inside the frame (scaled with it, so a glow keeps its place on a
  bigger image), radius (object units), colour, mode. A piece may carry several,
  and every step that shows a light's source carries it (the fire glow on every fire pit step, the oven light
  from the oven on).

The scene draws, for every occupied spot, the piece of step n. The fixed pieces (chest, window, campfire)
keep their own sizes and lights.

A spot's step count is **cumulative across chapters**: one running index into the spot's full step list
(sleeping place at 4 = mat, blanket, windbreak, tent). The scene clamps a count to the steps the current
chapter allows (my call); it never draws a later chapter's piece. "Full" for a chapter means every
step up to and including that chapter.

Chapters are the `Difficulty` values; `camp.md`'s "beginner" is `starter`.

The fixed fire (my call): a small flame on bare sand with its glow is there from the start. The fire pit's
steps build around it, and its "fire" step makes the flame bigger with a wider glow.

## Light

- A glow is a radial gradient in the camp layer's coordinates, so it scales and moves with its piece.
  It is blended (`mix-blend-mode`) over ground and camp, lifting what it covers toward a warm colour.
- The scene as a whole sits under a cool night tint; the glows are what pull warm colour back out.
  The site map lights its floors the same way (`src/app/SiteMap/lighting.ts`,
  `docs/instructions/map-rendering.md`); reuse its thinking, not necessarily its code.
- Fire glows **flicker**: a slow, irregular change in radius and strength. The window and the chest
  **breathe**: slower and smaller.
- Under `prefers-reduced-motion` every glow holds still at its middle value.

## Shadows

- Each piece casts ONE **contact shadow**, pre-rendered at import: `yarn import-camp` writes
  `src/assets/camp/<id>-shadow.webp` beside the piece. It is a black band along the object's base: per
  column of the keyed alpha, from the lowest opaque pixel up about 6% of the canvas height, so it follows
  the object's own base contour. It is blurred once, on the same canvas so it lines up with the piece's
  frame. A whole silhouette laid flat cannot follow the base of an object seen from 3/4 above; this band
  can. Scenery (`sand`, `dunes`, `pyramid`, `pyramidGold`, and any `--key=none` import) casts none.
- The layout gives every placed piece a shadow direction, offset and strength. A piece inside a fire's
  (`flicker`) glow is lit by it alone; between that glow's radius and three times it the direction blends
  toward the moon's, which falls to the lower right; past that the moon casts it. A piece's own light
  never shadows it: a piece that burns casts none. Near the fire a shadow is dark and shifted about 0.06u
  from the base, under the moon faint and shifted about 0.03u, with a floor on strength so nothing floats.
- The shadow is drawn exactly under its piece, in the same box and depth order, with no rotation and no
  flattening, translated away from the light by its offset. Only `transform` and `opacity` are set,
  never a runtime `filter`, so the blur costs nothing per frame.
- **Self-shading:** the art keeps its own painted form shading, from one fixed neutral light at the upper
  left for every piece, so the self-shade stays subtle: it adds only the fire-relative nuance on top.
  Every drawn piece with art, unless it burns, gets one overlay in its own box, masked (`mask-image`) by
  the piece's own art so it covers only the piece. It holds a `linear-gradient` along the light
  direction: a faint warm tint toward a fire (nothing toward the moon), a darkening of at most about 0.2
  black away from it at full fire. Its opacity follows the shadow's strength. A plain alpha overlay: no
  `filter` and no `mix-blend-mode`.
- A firelit shadow and self-shade flicker their opacity in step with their fire's glow; under
  `prefers-reduced-motion` they hold still. A stand-in casts no shadow and has no self-shade; a piece
  without a shadow file casts none.

## Two-frame fire

- A burning piece may have a second frame, `src/assets/camp/<id>-b.webp`, an edit of the first with only
  the flames repainted. The scene stacks both and shows one at a time with a `steps()` opacity animation
  at about 3–4 Hz, two unequal holds giving it an irregular feel. Under `prefers-reduced-motion` only the
  first frame shows. A piece without a `-b` file is drawn as one image.
- The art lookup lists `-b` and `-shadow` files under their piece, never as pieces of their own.

## Art

- Every piece is painted in neutral night light, with no warm glow in it, so code can light it.
- Ground and horizon are seamless repeating textures (`docs/game-design/art-pipeline.md` §0: tiling
  materials).
- Shipped art lives in `src/assets/camp/`, masters in `art/masters/camp/`, as for the map tiles.
- **Missing art draws a stand-in** (simple shape plus the piece's name) so the whole component works in
  Storybook before one piece is painted. The stand-in is for development only: the camp does not ship to
  players while a stand-in still shows. How that is enforced is the builder's call.

## The component

- An atom in `src/ui/atoms/CampScene.tsx` with `CampScene.stories.tsx` next to it.
- Props: the container's **width and height** in px, the chapter (a `Difficulty`), the step count per
  spot, per entrance a translated label, an optional badge and an open callback, and **top and bottom insets** in px (my call): the space the HUD in the sky and the
  floating "Op pad" take. The frame is fitted between the insets, so nothing occupied sits under an
  overlay; sky and sand still run to the edges behind them. The integration passes the device's safe
  area (`env(safe-area-inset-*)`) plus its own overlay heights; the scene does not read `env()` itself.
  No hooks into game state, no storage.
- The layout is a **pure function** of (container size, chapter, step counts) that returns the placed
  pieces, glows, pyramids and the camera. The component only renders its result. That function carries
  the tests: the frame is never cropped, both stretches stay within their range, no two spots at the same
  depth overlap, every spot keeps its order in x and in y across containers and chapters, a later-chapter spot is not drawn.
- The spot/step/piece catalogue is data in one file, next to the layout.
- Labels (entrance names) come in as props, already translated; the caller composes them (the window's
  "Mosaic 61/252"). The `camp.entrance.*` locale keys are the caller's.
- Rendering is HTML elements positioned with CSS transforms, no canvas. The size comes in as props: the
  caller measures its container and passes width and height, so the scene reflows whenever the caller's
  measurement changes. A ui atom holds no state and measures nothing.

## Storybook

- One story per chapter, empty (zero finds) and full (every step of that chapter).
- A partial camp (some spots part-built).
- The same camp at fixed container sizes: phone portrait 390×844, tablet 820×1180, desktop pane
  1000×836, ultrawide 1600×700.
- A playground with controls for the chapter and each spot's step count.
- All stories run with the stand-ins until the art exists; no story fakes game logic.

## Left to the builder

- The exact stretch ranges, depth scaling and chapter frames (start from the prototype's
  values).
- How glows are blended and animated, within "flicker" and "breathe" above.
- How the art catalogue is shaped in code.
- How the "no stand-in ships" rule is enforced.
