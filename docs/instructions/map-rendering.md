# How the site map is drawn

The map is **HTML**: a `div` the size of the floor, with layers stacked in it and scaled by one transform.
The only SVG left is per-marker icons and the placeholder glyphs — a shape per node kind, a colour per
state, key badges on the rim.

It used to be one `<svg>` two thousand units across with everything inside it. This says why it is not,
and what to keep in mind when adding to it.

## Why it is not SVG

An SVG child gets no layer of its own, so anything that MOVES inside the map invalidates the map: the
browser repaints the region under it, which means re-rasterising the paths and re-decoding the tile PNGs
beneath. Measured on a real Chrome against a starter floor, idle, nobody touching it:

|                 | paint events / 5s | paint time / 5s | image decodes             |
| --------------- | ----------------- | --------------- | ------------------------- |
| one big `<svg>` | 602               | 173 ms          | 25–30% of trace wall time |
| HTML layers     | 96                | 22 ms           | 0                         |

That was a phone that got warm in the hand, a battery going down while the map sat open, and a drag that
stuttered on a big floor. The 26 drifting motes and four flickering lamp pools alone came to ~15% of a
core. Elements on a starter floor came down with it: 754 → 478.

## The shape of it

Bottom to top, all inside `[data-map]`:

| layer                                                                   | what it is                                                                            |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `TileLayers`                                                            | floor, wall mass, faces, tops, sills, shadows, state washes                           |
| sand, scatter, arch shadows, the lit place, scarabs, growth, wall items | the floor's own dressing                                                              |
| the markers                                                             | one `MarkerCell` per cell: an icon in a little `<svg>`, in a box the size of the cell |
| the standing layer                                                      | props, chests, stairs, exits, gates, the explorer — sorted by floor line              |
| archways and gates                                                      | drawn last, so the player walks under them                                            |
| the shade's second pass, then the light's                               | the dark that seats what is standing, and the lamp reaching it (see below)            |
| `MapWeather`                                                            | over the SCROLLING BOX, not inside the map: drift and tint belong to the window       |

Two primitives build almost all of it (`htmlLayers.tsx`): **`Sprite`**, a box with the art as its
background, and **`ClipLayer`**, a map-sized box cut to a path.

## What to keep in mind

- **`clip-path: path()` takes the `d` strings the geometry already builds** — `rectsToPath`,
  `footprintPath` — and resolves them in the element's OWN box. So a layer that carries a clip is laid out
  at the map's full size with its art placed by `background-position`, never by `left`/`top`. That is why
  a footprint path needs no translating.
- **One element per group, never one per rectangle.** Floor, mass, face, top, shadow and wash come to some
  seven thousand elements a floor that way, which is what the merged `<path>` existed to avoid. A floor's
  whole masonry is 22 elements.
- **A cell with nothing to draw and nothing to tap is not drawn.** Most of a floor is corridor with no
  marker on it, and the boxes holding nothing cost more than everything they held.
- **A marker's box is its tap target.** Cells do not overlap, so a cell's worth of target cannot poach a
  neighbour's — and only a cell you can act on takes the tap, the rest being `pointer-events: none` so a
  drag or a double-tap reaches the map.
- **Depth is DOM order** in the standing layer. The sort by floor line already exists; no `z-index`.
- **Motion is Tailwind's**, in `@theme` (`index.css`, "The map's own motion"), driven by variables each
  element sets for itself. Reduced motion is `motion-reduce:animate-none` at the point of use.
- **`mix-blend-mode` makes a stacking context** and forces what is under it to composite together. The
  light pools use it; do not spread it further.
- **`will-change` is a promise, not a hint.** One per moving thing.
- **The floor is drawn dark and the light is what lifts it** (`FloorShade`, `LitPlaces`, `LightPool`).
  Every explored cell used to draw at full brightness whether anything lit it or not, so the picture had
  no value range and the light had nothing to be bright against. The shade falls in two passes — the full
  one UNDER the click markers, which are the layer the floor is read by and lose most of their contrast if
  washed with it; a lighter one over everything, so furniture is seated in the same dark it stands in.
- **A wash is a scale plus an added colour, and both halves have to be paid for.** `art × (1−a) + wash × a`:
  the scale flattens the art's own modelling, and at a floor already scaled to a third the added colour is
  most of what is left of it. A near-neutral wash at `a = 0.56` took the starter floor from L\* 40 to 16
  with 61% of its chroma gone and its hue dragged from ochre (73°) to a cold magenta (330°) — a lit room
  of grey mush with pale cut-outs standing in it, on art that had the colour all along. So the wash colour
  is the rank's OWN near-black (`outline`), which adds the rank's own hue rather than a foreign one, and
  the alpha is solved rather than authored: whatever lands that rank's floor at **L\* ≈ 24**.
- **The ranks are held together by their targets and told apart by their hues.** Floor at L\* 24 and a
  7.5-step back to the wall on every rank; starter ochre at C\* 6.6, junior ochre at 18.2, expert cold at
  263°, wizard verdigris at 168°. Consistent is not flat: same rule everywhere, different character in it.
- **A vertical face takes a helping of the night the floor does not** (`faceNight`). A lamp is carried at
  floor level, so a wall takes its light at a glancing angle — and without that the two planes land within
  a step of each other once the night is over both (the starter art's 9.5 step measures 3.5 as drawn) and
  a room reads as a floorplan with a change of texture rather than as a place with walls. Solved per rank
  to the same RENDERED step, because the art's own runs from 6.8 to 22.7 and it is what the player sees
  that has to agree. The wall MASS takes none of it: it is the rock seen from above, so it is lit like
  ground, and it already sits 9–14 L\* under the floor.
- **The light falls in the same two passes, and for the same reason read backwards.** A lit place drawn
  only under the shade's second pass hands a quarter of the tier's night back to everything the lamp just
  reached: measured on starter stone that took the lit floor from 114 to 89 and the explorer to 65 — a
  hero darker than the ground under their own feet, on a map where nothing was above 106 of 255 to begin
  with. So `LitPlaces` is drawn twice: the full pass on the floor, and a lighter one after the shade's
  second, reaching a wall band ABOVE each lit cell so a prop standing against the north wall is lit to the
  top of its own headroom instead of being cut off at the floor line.
- **A light needs a source, or it is a highlight.** The lit place is clipped to the floor rects of a whole
  room or corridor run — that is WHERE light may land, and it is set by the rules of the place, not by
  distance. HOW MUCH lands where is the fill: a radial gradient centred on the cell the explorer is
  standing in (`torchFill`), hottest at the flame and down to a bit under half of it at the far end. Flat,
  the same shape read as a rectangle of floor raised by a fixed amount. It never falls to nothing, because
  a torch carried along a passage lights the passage as far as the next turn, however long that is.
- **Light is warm or it is not light.** A near-white lamp screen-blended over stone lifts every channel by
  about the same amount, which turns the floor pale rather than warm — the old `#ffe2b0` left the lit floor
  at 4% saturation on expert and 16% on starter. Hold the blue channel back.
- **The explorer is lit too, not just the ground they stand on** (`FIGURE_LIT`). A pool on the floor is
  under their feet and cannot reach them. A small brightness lift, a saturation lift, and a warm
  `drop-shadow` hugging the silhouette — the rim being the part that separates a figure from stone of a
  similar value at the zoom a floor is read at. Keep the brightness small: the art's own highlights are
  already near 229 and more of it clips them flat.
- **Everything standing on this floor casts a shadow, so the explorer does too** (`FootShadow`). A prop's
  art bakes a contact shadow into its own bottom rows — a chest fills 100 of its 112 columns with it — and
  an archway, whose shadow falls outside its slot, is given one by hand (`ArchShadows`). The explorer's
  sprites stop at the boots. Against a dim floor that passed; lifting the floor took away the last thing
  holding the figure down. An ellipse rather than the straight band a wall casts, because a hard rectangle
  under a pair of boots reads as a plinth, straddling the sprite's own bottom edge so it sits UNDER the
  feet — and over the torch pool, since a shadow is not lit by the pool it lies in.
- **A light pool is not clipped to the floor**, and is not meant to be: a wide one lays light over the
  solid rock beside a one-cell corridor, which reads as haze coming off the flame. What lights a ROOM as a
  room is still the lit place, which is clipped to the floor rects.
- **A pinch writes nothing but `transform`** (`useMapZoom`): it scales about the map point the fingers
  closed on, and the PAN is left to the browser's own two-finger scroll. Resizing the sizer or writing
  `scrollLeft` per move costs a layout of the floor a frame, and iOS has usually already taken the gesture
  for its own scrolling by the time the second finger lands — so both then drag the map at once.
- **The zoom is committed to the sizer once the SCROLLING stops, not when the fingers lift.** Committing
  measures the map and scrolls to keep it where it is, and every one of those numbers is read through the
  scroll offset, which iOS withholds from the main thread until its scroll comes to rest. Measured
  mid-scroll it reads where the floor sat BEFORE the pan and puts that back. The wait is invisible: the
  gesture's transform is still on screen. `overflow-anchor` is off on the scroll box for the same moment
  — the sizer resizes by a whole zoom step there, and scroll anchoring would answer that with a move of
  its own.
- **Tests address the map by data attribute**, never by tag: `[data-map]`, `[data-map-scroll]`,
  `[data-map-tint]`, `[data-tile]`, `[data-marker-cell]`, `[data-node-sprite]`, `[data-light-pool]`,
  `[data-torch]`, `[data-arch-shadow]`, `[data-explorer]`. `SiteMapView.spec.tsx` opens with
  `spritesIn` / `urlOf` / `boxOf` / `clipOf`, which read a sprite off its style.

## Measuring a change to it

Production build — a dev server's own overhead swamps the reading. Settle 30s, then count trace events
rather than CPU percent: `Paint`, `RasterTask`, `ImageDecodeTask` over five seconds, with the moving parts
present and then deleted from the DOM. **If deleting them changes the paint count, they are not
composited.** Compare screenshots by pixel diff rather than by eye — **with motion disabled**
(`reducedMotion: "reduce"`, which the map honours through `motion-reduce:animate-none`). The air is
always moving, so two shots of an untouched map differ by a few percent of their subpixels; a
behaviour-neutral change reads as several percent of noise until the dust is told to stand still, and
then reads as zero.

Colour and value are measured off the ART, composited through the operators the renderer actually uses —
each wash as `art × (1−a) + wash × a`, each light as a `screen` at its opacity — and read as **L\***,
**chroma** and **hue angle** rather than as a WCAG ratio, which is built for text and understates
separation at the values a tomb is drawn at. Three numbers decide a change to the night: where the unlit
floor lands, how much of the art's own chroma and hue survive to it, and what the lamp is still worth
above it (the lit floor, less the unlit). A rank that moves alone has gone out of step with the others.
