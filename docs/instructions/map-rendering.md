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
  Its strength is set per tier against that tier's own slabs, and its HUE is where the ranks differ.
- **A light pool is not clipped to the floor.** A wide one lays light over the solid rock beside a
  one-cell corridor; what lights a ROOM is the lit place, which is clipped to the floor rects.
- **A pinch writes nothing but `transform`** (`useMapZoom`): it scales about the map point the fingers
  closed on, and the PAN is left to the browser's own two-finger scroll. Resizing the sizer or writing
  `scrollLeft` per move costs a layout of the floor a frame, and iOS has usually already taken the gesture
  for its own scrolling by the time the second finger lands — so both then drag the map at once. The zoom
  is committed to the sizer when the fingers lift.
- **Tests address the map by data attribute**, never by tag: `[data-map]`, `[data-map-scroll]`,
  `[data-map-tint]`, `[data-tile]`, `[data-marker-cell]`, `[data-node-sprite]`, `[data-light-pool]`,
  `[data-torch]`, `[data-arch-shadow]`, `[data-explorer]`. `SiteMapView.spec.tsx` opens with
  `spritesIn` / `urlOf` / `boxOf` / `clipOf`, which read a sprite off its style.

## Measuring a change to it

Production build — a dev server's own overhead swamps the reading. Settle 30s, then count trace events
rather than CPU percent: `Paint`, `RasterTask`, `ImageDecodeTask` over five seconds, with the moving parts
present and then deleted from the DOM. **If deleting them changes the paint count, they are not
composited.** Compare screenshots by pixel diff rather than by eye.
