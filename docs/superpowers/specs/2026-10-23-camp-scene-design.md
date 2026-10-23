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
clay oven, the lookout's signal fire, the fire bowl) bring their own small glow.

## Composition

### Layers, back to front

1. **Sky**: a CSS gradient plus stars and moon. Stretches to any height without a seam.
2. **Horizon**: the far dunes as a horizontally repeating strip, with the pyramids placed on it.
3. **Ground**: sand, a seamless repeating texture, from the horizon down to the bottom edge.
4. **Camp**: every piece of every occupied spot, plus the chest and the window, sorted by depth so a
   nearer piece overlaps a farther one.
5. **Light**: the glows, blended over layers 3 and 4.
6. **Entrances**: the chest, the window and (once it exists) the map table as buttons, each with a visible
   label and an optional badge.

### Spots as anchors, not coordinates

Every spot has a **row** (back, middle, front) and a **slot** in that row: a signed number of slot widths
left or right of the fire, which is slot 0 of the middle row. A spot never has a fixed pixel position.

The layout is data, tuned in the prototype. Starting layout (my call, follows `MobielIndeling` and the
wizard impression, rearranged so earlier chapters sit near the fire and later ones further out):

| Row    | −2.5      | −2     | −1       | 0           | +1     | +2          | +2.5        |
| ------ | --------- | ------ | -------- | ----------- | ------ | ----------- | ----------- |
| back   | lookout   |        | sleeping | star canopy | window | palm garden |             |
| middle |           | donkey | cooking  | fire        | water  | camel       |             |
| front  | ibis pond |        | chest    | map table   |        |             | god statues |

### Size and spacing are two separate things

- **Size** follows the container's **height** and the chapter's camera. A tent takes the same share of
  the screen's height on a phone and on a desktop.
- **Spacing** follows the **width** that is left. The distance between two slots is elastic between a
  minimum and a maximum, both in units of object size. On a phone the spots pack close (about 60 px per
  spot at 390 px wide); on a desktop they spread out, and once spacing hits its maximum only empty desert
  grows at the sides.
- **Depth**: a farther row stands higher on the ground and is drawn a little smaller. The vertical gap
  between rows is elastic the same way: the rows spread to fill the ground between the lowest horizon
  (plus a strip of far sand) and the bottom edge, up to a maximum. A portrait phone, where the width
  keeps objects small, gets a camp spread down the whole screen, not one packed at the bottom.
- Spacing never drops below the minimum. At the minimum, no two spots in a row overlap.
- **When the width runs out, the objects shrink** (my call). The object size is the smaller of "what the
  height allows" and "what fits the frame at minimum spacing". A portrait phone at wizard is
  width-bound: objects get smaller, the spare height goes to sky. "Same share of the height" holds only
  while the width allows it; no-overlap and never-cropped always hold.

### Starting numbers (from the prototype)

All in units of object size `u` (a front-row object is `1u` wide):

| What                                  | Value                               |
| ------------------------------------- | ----------------------------------- |
| slot spacing                          | 1.15 – 2.3                          |
| gap between row baselines             | 0.75 – 5 (back gap ×0.85)           |
| far sand between horizon and back row | at least 0.5                        |
| depth scale back / middle / front     | 0.78 / 0.89 / 1                     |
| slot spread back / middle / front     | 0.88 / 0.95 / 1                     |
| minimum sky above the back row        | 1.7                                 |
| lowest horizon, share of height       | 0.27 from the top                   |
| insets top / bottom (px, phone)       | 56 / 96 (HUD; safe area + "Op pad") |
| padding below the front row           | 0.35                                |
| camera height per chapter             | 4.2 / 4.8 / 5.4 / 6.0 / 6.6         |
| frame side margin                     | 0.65 each side                      |

`u = min(H / max(cameraHeight, minHeight), W / (span × minSpacing + 1.3))`, then spacing and row gap
are solved from what is left and clamped. At 390×844, wizard comes out at u ≈ 56 px, about 64 px per
slot.

### The camera zooms out per chapter

Each chapter has a **frame**: the bounding box of the spots that chapter can hold, plus the chest, window
and fire. Beginner sits close to the fire; each later chapter takes one step out; wizard frames the whole
camp. The frame is fitted into the container without cropping it:

- spare height above the frame is filled first with **far sand**: the horizon never sits lower than a
  fixed share of the height (about a quarter from the top, as in the impressions), so the gap between
  the dunes and the camp grows instead of the sky. Only when the camp itself reaches that line does the
  horizon go up further;
- spare width beside the frame is filled with sand and dunes;
- the frame is never cut.

Spots keep their slot when a chapter is added: the camera zooms out to reveal ground where the new spots
will stand. Nothing shifts sideways because a chapter was reached.

A spot that belongs to a later chapter than the current one is not drawn. A spot of the current chapter
with zero steps is not drawn either. Both are just sand.

### Steps are pieces

Each step of a spot (the list in `camp.md` "Camp loot", in order) is **one piece**: the whole spot as it
looks at that step, one square image (`src/assets/camp/<piece id>.webp`, see `camp-art-prompts.md`). A piece has:

- its frame: a square 1×1 object unit, anchored bottom-centre on the spot (`dx = dy = 0`);
- the id of the previous step's piece in `replaces`, so only the latest step of a spot is drawn (the fire
  pit's first step also replaces the fixed campfire);
- optionally a list of **lights**: offset inside the frame, radius, colour, mode. A piece may carry several,
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

- Each piece casts ONE combined shadow, pre-rendered at import: `yarn import-camp` writes
  `src/assets/camp/<id>-shadow.webp` beside the piece, the keyed piece's alpha as a black silhouette,
  blurred once, on the same canvas so it lines up with the piece's frame. Scenery (`sand`, `dunes`,
  `pyramid`, `pyramidGold`, and any `--key=none` import) casts none.
- The layout gives every placed piece a shadow direction, length and strength. A piece inside a fire's
  (`flicker`) glow is lit by it alone; between that glow's radius and three times it the direction blends
  toward the moon's, which falls to the lower right; past that the moon casts it. A piece's own light
  never shadows it. Near the fire a shadow is short and dark, under the moon long and faint, with a
  floor on strength so nothing floats.
- The shadow is drawn under its piece, in the same depth order, pivoting at the art's ground line
  (88% of the frame): stretched to its length, turned to its direction and flattened onto the ground.
  Only `transform` and `opacity` are set, never a runtime `filter`, so the blur costs nothing per frame.
- A firelit shadow flickers its opacity in step with its fire's glow; under `prefers-reduced-motion` it
  holds still. A stand-in, or a piece without a shadow file, casts none.

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
  the tests: the frame is never cropped, spacing stays within its bounds, no two spots in a row overlap at
  the minimum, a spot keeps its slot across chapters, a later-chapter spot is not drawn.
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

- The exact spacing bounds, row heights, depth scaling and chapter frames (start from the prototype's
  values).
- How glows are blended and animated, within "flicker" and "breathe" above.
- How the art catalogue is shaped in code.
- How the "no stand-in ships" rule is enforced.
