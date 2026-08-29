# Art Pipeline — generating sprites and materials

How painted art gets made for this project, which tool makes which kind, and the prompts to make it with.
Two independent piles of work live here; they share nothing but this document.

- **Pile A — rush hour pieces** (`puzzles/rush-hour.md` §5). Small, self-contained, hangs off `skins.ts`.
  Buildable today.
- **Pile B — site map art** (`spritesheet-renderer-prep.md`). Props are buildable today; floors and walls
  wait on wiring that does not exist yet (§B.1). The pile that decides whether Midjourney is worth buying.

---

## 0. Which tool makes which thing

The choice is not about which model is prettier. It is about which of three jobs the asset is.

| Job                                                    | Tool                     | Why                                                                                   |
| ------------------------------------------------------ | ------------------------ | ------------------------------------------------------------------------------------- |
| **Cutout objects** — a sledge, a pot, a brazier        | **Gemini** (Nano Banana) | Follows framing constraints, edits an existing image ("same sledge, now three cells") |
| **Seamless tiling materials** — a floor, a wall        | **Midjourney** `--tile`  | Only tool with a real seamless mode. Everything else leaves seams to heal by hand     |
| **Autotile combinations, wall corners, tile variants** | **Code**                 | Not an art problem. See §B.2                                                          |
| **Animated player sprite**                             | Neither yet              | Frame-to-frame consistency is where both models fall apart. A separate fight          |

**Midjourney is worth one month, not a habit.** Buy Basic (~$10) when Pile B starts, batch all ten materials
with `--tile` in one sitting, keep the `--sref` style code off whichever floor reads best so the other nine
match it, cancel. Pile A never needs it — a subscription bought for rush hour alone is money for a job
Midjourney is actively worse at.

**The cheapest move of all is still to not make the art.** The rush hour board reads correctly today with
CSS shapes; §5 calls painted sprites "a good bargain", not a requirement.

---

## A. Rush hour pieces

### A.1 Where the art hangs

**No spritesheet, no manifest.** The board already draws every piece as an absolutely-positioned div sized
in exact percentages of the frame. Stretch an image inside that div and geometry stays CSS-exact — art can
never lie about how many cells a piece owns, which is §5's first condition.

```tsx
// skins.ts — add to RushHourSkin
art?: { ground: string; piece2: string; piece3: string; player: string; wall: string }

// RushHourBoard.tsx — inside the piece div
{skin.art && (
  <img
    src={mine ? skin.art.player : piece.len === 3 ? skin.art.piece3 : skin.art.piece2}
    alt=""
    draggable={false}
    className="pointer-events-none absolute inset-0 size-full object-fill"
  />
)}
```

**A vertical piece is the same image rotated 90°**, which is §5's second condition and halves the asset
count. It only holds if the art has **zero directional lighting** — no cast shadow, no top-lit highlight.
That is why every prompt below insists on flat omnidirectional light.

Five images a face: `ground`, `piece2`, `piece3`, `player`, `wall`.

### A.2 Export targets

A cell tops out around 116px (`max-w-[min(92vw,60vh)]` over 6 cells). Author at 2x, cell = 128px.

| Asset  | Final px           | Ratio |
| ------ | ------------------ | ----- |
| piece2 | 256 × 128          | 2:1   |
| piece3 | 384 × 128          | 3:1   |
| player | 256 × 128          | 2:1   |
| wall   | 128 × 128          | 1:1   |
| ground | 512 × 512 seamless | 1:1   |

Gemini offers no 2:1 or 3:1 aspect ratio. Generate 1:1, tell it to fill a centered strip of the right
proportion against magenta, crop in post.

### A.3 Shared preamble — paste on top of every Pile A prompt

```
Top-down orthographic game sprite, straight down, zero perspective, zero
foreshortening. Completely flat omnidirectional lighting: no cast shadow, no
drop shadow, no highlight favouring any one side — the image must look
identical when rotated 90 degrees. Hand-painted texture, matte, ancient
Egyptian Old Kingdom material culture. Solid magenta background #FF00FF, no
gradient, no vignette, no border, no frame, no text, no watermark, no ground
plane under the object. Object silhouette only against the magenta.
```

### A.4 Face — "market lane" (sledges jammed in a market street)

**ground**

```
[preamble] Seamless tileable texture, square, edges must wrap on all four
sides. Packed sun-baked earth street of an Egyptian market lane: dry ochre
dust over flat worn limestone slabs, faint sledge-runner scuffs, scattered
grit and chaff. Muted, low contrast, dark enough that objects laid on top read
clearly — value around a dark warm brown, #1c1917 to #292524. No objects, no
shadows, no focal point, uniform across the whole square.
```

**piece2**

```
[preamble] A single wooden cargo sledge loaded with tied sacks of grain, seen
from directly above. It fills a horizontal strip exactly twice as wide as it
is tall, centered on the square canvas, and it TOUCHES both the left and right
ends of that strip — the runners must run edge to edge with no gap. Weathered
acacia wood, rope lashings, coarse linen sacks. Warm greys and dull browns,
value around #57534e. Symmetrical front to back: no prow, no pointed end, no
arrow, both ends identical.
```

**piece3**

```
[preamble] A long wooden cargo sledge stacked with three stone blocks under
rope netting, seen from directly above. It fills a horizontal strip exactly
three times as wide as it is tall, centered on the square canvas, touching
both ends of that strip with no gap. Same weathered acacia wood, rope, dull
grey-brown palette as a matching shorter sledge. Both ends identical, no
pointed end.
```

**player**

```
[preamble] The player's own sledge, seen from directly above, filling a
horizontal strip exactly twice as wide as it is tall and touching both ends of
it. It is the ONE piece on the board that is not a plain rectangle: the right
end tapers to a blunt pointed prow, like an arrowhead, unmistakably pointing
right. Polished cedar with gilded fittings and a bright amber-gold rope
lashing, #f59e0b, clearly warmer and brighter than the dull grey working
sledges. Left end square and flat.
```

**wall**

```
[preamble] One square cell of an immovable obstruction: a solid plinth of
rough-hewn limestone masonry set into the street, flush with the ground, worn
and pitted. It must read as PART OF THE BUILDING, not as cargo — no wood, no
rope, no sacks, no crates, nothing that looks liftable. Cold pale grey stone,
fills the whole square edge to edge.
```

### A.5 Face — "quay" (barges warped along a wharf)

Same five prompts, same preamble, swapped nouns:

- **ground** — `Seamless tileable texture ... slow muddy Nile water at a wharf: dark green-brown, faint current ripples, scattered reed debris. Low contrast, dark, no reflections of anything, no sky, no highlights.`
- **piece2 / piece3** — `A reed-bundle cargo barge seen from directly above, filling a horizontal strip exactly [twice / three times] as wide as it is tall, touching both ends. Bound papyrus reed hull, deck of stacked amphorae under a linen cover. Both ends identically blunt — no bow, no stern, no steering oar.`
- **player** — `... the right end rises into a curved pointed papyrus prow, unmistakably pointing right. Painted hull with gilded trim and amber-gold cordage #f59e0b, brighter than the plain working barges.`
- **wall** — `One square cell of a stone mooring bollard block set in the quay, cut granite, flush, immovable. Must not resemble a boat or cargo.`

### A.6 Post-touchup checklist

1. **Crop to the strip, ends flush to the crop, no transparent margin.** The one step that must be exact —
   §5: a hull stopping short of the cell boundary makes a 3 read as a 2 and the player deduces wrongly.
2. Key out `#FF00FF`, despill the fringe.
3. **Rotate 90° and look at it.** Any visible lighting direction means the art fails the shared-rotation
   trick and that face needs separate vertical art.
4. Export PNG at the §A.2 sizes into `src/assets/rushHour/<face>/`.

### A.7 The tag lands with the art

`puzzles/rush-hour.md` §5: the family withholds its `trade` role tag until it has a face that is somewhere
rather than nowhere. That tag is worth four journeys and 187 rooms (`journeys.md` §9). **Add the art and the
tag in the same PR** — art alone leaves the rooms on the table.

---

## B. Site map art

`spritesheet-renderer-prep.md` holds the authored decisions — sizes, file layout, fallbacks. This section
is only the generation half: what to type at which model. **Where the two disagree, that document wins.**

### B.1 Props first, and props are not blocked

**Props can start today.** `RoomCell.decoration` is already placed by `siteAssembler` from the DSL's
`decorations` pool, and needs none of the plumbing floors need: no theme propagation, no autotile, no area
lookup. Every sprite is optional and a missing one falls back to the placeholder glyph
(`SiteMapView.tsx`'s `DecorationGlyph`), so props land one file at a time rather than as a branch that has
to be finished before anything can be seen.

**Floors and walls are blocked**, and on the wiring in that document's item 1: `theme` exists on
`PyramidConstraint` in `dsl.ts` but is never written into `FloorConfig` and never reaches `SiteMapView`, and
area/ward styling needs a `sectionHash → { difficulty, theme }` lookup that does not exist. Without both, no
floor can choose which material it wears. It is a no-visual-change PR, and it comes first.

One decision is still open there and it changes the count below: whether a floor material reads off `theme`
alone or off `theme` + `RoomCell.difficulty`. The second is what "difficulty shown, not labelled" asks for,
and it means a sand floor needs a gentle and a wizard variant rather than one.

### B.2 Generate materials, never tiles

The naive read is 16 autotile combinations × variants × five themes (desert, water, plants, cold stone,
amethyst). That is several hundred images, and **no image model keeps a 16-piece autotile set seamless and
self-consistent.** Not a fight worth having.

Collapse it to **two seamless materials per theme** — floor and wall — and keep the 16 combinations as
geometry: mask the material with the wall shape, exactly as `SiteMapView` masks rects today. Tile variants
(`hash(row, col, siteId) % n`) come free from offsetting the material's background-position; they cost no
extra art. Fog and cell state stay a wash over the material, never a second set of art.

**This is already the project's path**, not a new idea: `StoneFrame.tsx` tiles `masonry-stone.png` at 140px,
and `tombImageMap.ts` swaps five masonry variants to give five looks.

### B.3 Materials — Midjourney

Ten images, one sitting. Generate the first, keep its `--sref` code, pass that code to the other nine so the
set reads as one world. Author at 512² and let it tile; the cell is 112px (`mapScale.ts`), so a material
covers several cells and its repeat must not be legible.

```
seamless tileable top-down texture, ancient Egyptian tomb floor, worn
limestone slabs, fine drift sand in the joints, flat even light, no objects,
no shadows, low contrast, dark --tile --ar 1:1
```

Swap the material clause per theme and per floor/wall:

| Theme      | Floor                                                  | Wall                                                    |
| ---------- | ------------------------------------------------------ | ------------------------------------------------------- |
| desert     | worn limestone slabs, fine drift sand in the joints    | sandblasted sandstone blocks, wind-scoured courses      |
| water      | wet dark flagstones, shallow standing water, silt      | damp granite courses, waterline stain, salt bloom       |
| plants     | cracked stone under creeping vine and moss             | stone courses swallowed by root and lichen              |
| cold stone | dark polished basalt, close-fitted joints, frost sheen | black granite ashlar, tight seams, cold grey highlights |
| amethyst   | violet crystal-veined stone, faint internal glow       | dark rock face studded with raw amethyst geodes         |

**Low contrast and dark is a requirement, not taste.** Walls, nodes, fog and the explorer are all drawn as
geometry on top and have to stay readable against it.

### B.4 Props — Gemini

**The names are fixed and there are seven of them**: `sarcophagus`, `statue`, `fountain`, `pit`, `rubble`,
`pillar`, `chestProp` (`DecorationKind` in `game/siteTypes.ts`). Filenames match those values exactly —
`src/assets/tiles/<theme>/<name>.png` — because the filename IS the lookup key.

**Draw the `default` set first, all seven.** A theme is a set of OVERRIDES over `default`, not a second
whole set: a desert floor with its own sand but no statue of its own draws the default statue. So a second
theme costs only the props that genuinely differ, and the game never ends up with six half-finished themes.

Target: **112px square, transparent PNG, subject centred and drawn to fill the square** (it is scaled with
`xMidYMid meet`, so a tall prop stays tall next to a wide one). Author at 2× and downsample.

Use the §A.3 preamble — magenta background, crop and key, since Gemini's transparency is unreliable — and
feed the finished floor material in as a style reference so a prop belongs to the ground it stands on.

```
[preamble] A single <prop>, seen from directly above, centred and filling the
square canvas edge to edge. Ancient Egyptian, weathered, matte. Reads clearly
as a silhouette at small size. No base plate, no ground under it, no cast
shadow.
```

Prop clauses: `carved stone sarcophagus, lid slightly askew` · `standing basalt statue of a seated figure` ·
`stone basin fountain with still water` · `open pit, broken floor edge, darkness below` · `heap of fallen masonry rubble` · `fluted stone pillar, top-down so the capital reads as a disc` · `banded wooden chest, iron fittings, closed`.

Prep doc already says where they may go: `kind: "room" | "corridor"` is computed per cell today, and
**corridors stay bare while rooms (including claimed cells) carry decoration.**

---

## C. Deliberately not done

- **Spritesheet, manifest, tile variants as art, per-axis rush hour art, 9-slice end caps.** One file per
  sprite until the request count measurably hurts; repacking into an atlas is a build step (`free-tex-packer-cli`, `spritesmith`) that only changes the resolver.
- **Animated player sprite.** Needs frame-to-frame consistency neither model gives reliably. Its own task.
- **Rush hour riding the site map tileset.** The two piles are independent; rush hour art hangs off
  `skins.ts`, not the tile renderer.
