# The map, out of SVG and into HTML

The site map is one `<svg>` two thousand units across with every floor, wall, prop, marker and figure
inside it. This is the plan for taking it apart into HTML layers, band by band, with the map playable at
the end of every step.

## Why

Not taste. An SVG child gets no layer of its own, so anything that MOVES inside the map invalidates the
map: the browser repaints the region under it, which means re-rasterising the paths and re-decoding the
tile PNGs beneath. Measured on a real Chrome against a starter floor, idle, nobody touching it:

| | idle cost |
|---|---|
| map as it was | ~15% of a core, forever |
| 26 drifting motes, alone | ~4% |
| 4 flickering lamp pools, alone | ~5.5% |
| a trace of the repaint | 25–30% of wall time inside `ImageDecodeTask` — tile PNGs decoded again and again |

That is the warm phone. The same motes as absolutely positioned `div`s with a `translate` animation are
owned by the compositor: after the first slice a production build paints the same number of times with the
motes present as with them deleted from the DOM, and image decodes are **zero**.

The second prize is that HTML is the medium the rest of the app is written in — Tailwind, real elements,
DevTools that can point at a room.

## What carries over unchanged

The geometry is already SVG-free and stays that way. `tileRegions.ts` merges cells into rectangles,
`rectsToPath`/`footprintPath` turn rectangles into path data, `mapScale.ts` owns the pitch. CSS
`clip-path: path("…")` takes exactly the `d` string those already produce, resolved in the element's own
border box — and the map is laid out at natural size and scaled by a transform (`useMapZoom`), so one unit
is one pixel and no path has to be rewritten.

| SVG today | HTML tomorrow |
|---|---|
| `<pattern>` + `<path fill=url(#…)>` | `div` with `background-image` + `background-size` + `clip-path: path(…)` |
| `<image href>` | `div` with `background-image`, or `<img>` |
| per-room `<clipPath>` | `clip-path: path(footprintPath(...))` on the same element |
| `<radialGradient>` light pool | `background: radial-gradient(...)` + `mix-blend-mode: screen` |
| walk-cycle strip in a clip | `overflow: hidden` box + strip child — the ordinary CSS sprite |
| depth sort into one flat list | same sort, written as DOM order |
| `image-rendering` on the `<svg>` | the same property on the layers |
| stroke-under-fill silhouette | `filter: drop-shadow()` on the clipped floor layer |

## The slices

Each one moves a whole DEPTH BAND. A band can become an HTML layer in the stack while the rest of the map
is still the SVG sitting in that stack as one more layer — what cannot be split is a band whose members
sort against each other (props and the player), which is why they move together.

**1 — the air. DONE.** `MapWeather` is an HTML overlay over the scrolling box, not the last group inside
the map, so motes cross the SCREEN rather than the floor and neither pan nor zoom touches them. The lamp
flicker went `steps(1, end)`: five repaints a cycle instead of a hundred and thirty, and a flame that snaps
reads better than one that breathes.

**2 — floor and walls.** `TileLayers` becomes one absolutely positioned layer per tier per group, each a
div with the tier's tile as a repeating background, clipped to that group's merged path. The `<defs>` full
of `<pattern>` goes with it. Acceptance: the three painted ranks screenshot identically, `tileRegions.spec`
is untouched (it never knew about SVG), and a floor built of two tiers still shows its seam.

**3 — everything that stands on the floor**, in one go, because it all sorts against the player: props,
chests, stairs, exits, gates, scatter, drifts, growth, scarabs, and the explorer with his light pool and
walk cycle. One layer, children in `baseY` order, each with its own room clip. Acceptance: the depth specs
in `SiteMapView.spec.tsx` keep passing with element queries instead of SVG ones, and the explorer still
passes behind the chest at the back of a room and in front of the one at the front.

**4 — markers and badges.** The node shapes are the one genuinely vector part: arch, chest, lock, ward
gate, key colours, the ✓ and the `!`. See the open question below before starting.

**5 — the root.** Delete the `<svg>`, retype `useMapZoom`'s `mapRef` to `HTMLDivElement` (nothing else in
it changes — it already writes `transform: scale()` by hand), and sweep the spec file for
`querySelectorAll("image")` and friends. Data attributes over tag names: `[data-map-scroll]`,
`[data-map-tint]` are already in, and each band should get one as it lands.

## Open question, before slice 4

The markers are drawn as paths and polygons and carry state colour and key badges. Three ways:

1. keep them as small inline `<svg>` icons inside the HTML — static, zero repaint cost, and no drawing
   work at all;
2. redraw them in CSS — borders, `clip-path`, `mask-image` — which is real work for shapes like the ward
   gate;
3. cut them as PNG/WebP sprites like everything else the map draws, which fits the art pipeline but ties a
   marker's colour to its file.

(1) costs nothing and breaks no rule that matters — the problem was never SVG, it was ANIMATION inside
SVG. (3) is the most consistent with how the map is painted. Decide before slice 4; slices 2 and 3 are
unaffected.

## Watch out for

- **`clip-path: path()` takes no viewBox.** It resolves against the element's own box. Keep every layer at
  the map's natural size and let the zoom transform do the scaling, exactly as now.
- **`mix-blend-mode` makes a stacking context** and forces the layers under it to be composited together.
  It is already what the light pools use; do not spread it further than the pools.
- **`will-change` is a promise, not a hint.** One per moving thing. Putting it on every prop would hand the
  compositor a few hundred layers to hold.
- **Depth is DOM order,** not `z-index`, once a band is one layer — the sort already exists, don't rebuild
  it as numbers.
- **Measure every slice the same way.** Production build (a dev server's own overhead swamps the reading),
  a settled page, and count trace events rather than CPU percent: `Paint`, `RasterTask`, `ImageDecodeTask`
  over five seconds, with the moving parts present and then deleted from the DOM. If deleting them changes
  the paint count, they are not composited.
