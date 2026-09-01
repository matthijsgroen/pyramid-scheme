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
| **A whole board's ground** — one fixed square          | **Either**               | It covers the frame whole and never repeats, so nothing about it has to tile (§A.2)   |
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
    className="pointer-events-none absolute max-w-none object-fill"
    style={{
      top: "50%",
      left: "50%",
      translate: "-50% -50%",
      width: `${(piece.horizontal ? 1 : piece.len) * 100}%`,
      height: `${(piece.horizontal ? 1 : 1 / piece.len) * 100}%`,
      rotate: piece.horizontal ? undefined : "90deg",
    }}
  />
)}
```

**A vertical piece is the same image rotated 90°**, which is §5's second condition and halves the asset
count. It only holds if the art has **zero directional lighting** — no cast shadow, no top-lit highlight.
That is why every prompt below insists on flat omnidirectional light. A turned image swaps the box it
fills, so it hangs off the box's middle and spins there rather than filling `inset-0`.

**`max-w-none` is not optional, and nothing catches its absence.** Tailwind preflight sets
`img { max-width: 100% }`, and a turned sprite is deliberately wider than the box it sits in — without it
the art comes out squashed rather than turned, silently. This only showed up in a browser: a mock
composited outside the DOM cannot see a preflight rule, and no unit test lays anything out.

Five images a face: `ground`, `piece2`, `piece3`, `player`, `wall`.

### A.2 Export targets

A cell tops out around 116px (`max-w-[min(92vw,60vh)]` over 6 cells), which is 232 device px at 2×. Author
at cell = 256.

| Asset  | Final px  | Ratio |
| ------ | --------- | ----- |
| piece2 | 512 × 256 | 2:1   |
| piece3 | 768 × 256 | 3:1   |
| player | 512 × 256 | 2:1   |
| wall   | 256 × 256 | 1:1   |
| ground | 1024²     | 1:1   |

**Do not ask the model for the ratio — crop to it.** Gemini offers no 2:1 or 3:1 aspect ratio, and telling
it "exactly twice as wide as it is tall" in the prompt does not work either. Measured on the market lane,
every single asset came back off: piece2 at 1.82 (wanted 2), piece3 at 2.44 (wanted 3), the player at 2.99
and then 2.67 on a redraw (wanted 2), the wall at 1.04. So generate 1:1 against magenta, ask only that the
whole object sit in the middle with room around it, and take the ratio in post — a non-uniform squash of
10–30% is invisible on sacks and rope, and the alternative is regenerating until a coin lands right.

**The ground does not tile, and asking it to is wasted effort.** The frame is one square that the ground
covers whole — `background-size: 100% 100%` over an `aspect-square` box distorts nothing — so there is no
seam to close and no repeat to disguise. The largest the frame ever gets is about 795 CSS px (60vh on a tall
desktop, so ~1590 device px at 2×) and the phone case is ~360; 1024² covers both. **Tiling is a site-map
problem** (§B.2), because that surface scrolls and multiplies across themes; a board is one fixed square.

**WebP, not PNG, for anything without alpha.** Measured on the first ground: 1024² WebP q80 is 19 KB where
512² PNG is 256 KB. The cutout props keep PNG because they need the alpha.

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
[preamble] A square of ground, filling the whole canvas. Packed sun-baked
earth street of an Egyptian market lane: dry ochre dust over flat worn
limestone slabs, faint sledge-runner scuffs, scattered grit and chaff. Muted,
low contrast, dark enough that objects laid on top read clearly — value around
a dark warm brown, #1c1917 to #292524. No objects, no shadows, no focal point,
even across the whole square.
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

### A.5 The other four faces — same five prompts, swapped nouns

**One face is one role, and the role is what makes it worth painting.** `journeys.md` §9 ranks the gaps by
the rooms they reach, and these four are what this mechanic can honestly dress as. Twenty images, one
sitting a face; nothing about the geometry changes between them, because the geometry is the rule (§5's
first condition), so each entry below is the §A.3 preamble plus §A.4's five prompts with its own nouns.

| Face      | Claims     | Why this one                                                                                                |
| --------- | ---------- | ----------------------------------------------------------------------------------------------------------- |
| `archive` | `scribe`   | The pool sits at three, one short of the floor a journey needs — this face alone unblocks restricting to it |
| `passage` | `funerary` | The widest role in the catalogue (781 rooms) and already authorable, so this buys variety inside it         |
| `barques` | `cosmos`   | `wizard_4`'s own place; one of the three carriers that story still needs                                    |
| `quay`    | `water`    | Cheapest to draw and buys the least — `water` already dresses every family in its pool                      |

**"quay" — barges warped along a wharf**

- **ground** — `A square of ground filling the whole canvas ... slow muddy Nile water at a wharf: dark green-brown, faint current ripples, scattered reed debris. Low contrast, dark, no reflections of anything, no sky, no highlights.`
- **piece2 / piece3** — `A reed-bundle cargo barge seen from directly above, filling a horizontal strip exactly [twice / three times] as wide as it is tall, touching both ends. Bound papyrus reed hull, deck of stacked amphorae under a linen cover. Both ends identically blunt — no bow, no stern, no steering oar.`
- **player** — `... the right end rises into a curved pointed papyrus prow, unmistakably pointing right. Painted hull with gilded trim and amber-gold cordage #f59e0b, brighter than the plain working barges.`
- **wall** — `One square cell of a stone mooring bollard block set in the quay, cut granite, flush, immovable. Must not resemble a boat or cargo.`

**"archive" — scroll cases racked in a records room**

- **ground** — `A square of ground filling the whole canvas ... the trodden plaster floor of a temple records room: dull ochre-grey plaster, papyrus chaff, dried ink spatter ground flat underfoot. Low contrast, dark, value #1c1917 to #292524, even across the square, no objects.`
- **piece2 / piece3** — `A bundle of papyrus scrolls lashed into a shallow reed carrying-tray, seen from directly above, filling a horizontal strip exactly [twice / three times] as wide as it is tall and touching both ends. The rolled ends of the papyri show as pale spirals; linen cord, reed tray, dust. Dull straw and grey-brown, value around #57534e. Both ends identical — no label, no seal, no pointed end.`
- **player** — `... the player's own is one sealed dispatch scroll in its case, filling the strip and touching both ends. The right end tapers to a gilded conical case cap like an arrowhead, unmistakably pointing right; red clay seal, polished case, amber-gold cord #f59e0b, clearly warmer and brighter than the dull working trays. Left end square and flat.`
- **wall** — `One square cell of a squat limestone plinth footing the shelving, set into the floor and flush with it, worn and pitted. It must read as PART OF THE BUILDING — no wood, no reed, no papyrus, nothing that looks liftable or carryable. Cold pale grey stone, fills the whole square edge to edge.`

**"passage" — a burial's freight jammed in a tomb corridor**

- **ground** — `A square of ground filling the whole canvas ... the cut limestone floor of a tomb corridor: pale grey blocks gone dusty, drifted sand in the joints, faint sledge-runner drag scars. Low contrast, dark, value #1c1917 to #292524, no objects, no shadows, even across the square.`
- **piece2 / piece3** — `[piece2: A linen-wrapped chest of canopic jars / piece3: A long carved stone lid under rope netting] lashed to a plain wooden drag-sledge, seen from directly above, filling a horizontal strip exactly [twice / three times] as wide as it is tall and touching both ends. Weathered acacia, rope, grey limestone, dusty linen. Cold greys and dull browns, value around #57534e. Symmetrical end to end — no head end, no foot end, no pointed end.`
- **player** — `... the player's own is a gilded anthropoid coffin on its sledge, filling the strip and touching both ends. The right end narrows into the pointed foot-case, unmistakably pointing right; gold leaf, inlaid blue collar, amber-gold bindings #f59e0b, the one warm bright thing among the grey stone freight. Left end square and flat.`
- **wall** — `One square cell of a portcullis blocking-stone set flush in the corridor floor, rough granite, worn, immovable. It must read as PART OF THE TOMB, not as freight — no wood, no rope, no linen, no lid, nothing that looks liftable. Cold pale grey stone, fills the whole square edge to edge.`

**"barques" — the night sky's boats, and the sun's own among them**

- **ground** — `A square of night sky filling the whole canvas: deep indigo going to near-black, dense fine stars, a faint dust of the milky way. Low contrast, dark, value #0f0d24 to #1e1b4b, no moon, no constellation lines, no horizon, no cloud, no focal point, even across the whole square.`
- **piece2 / piece3** — `A reed barque of the night sky seen from directly above, filling a horizontal strip exactly [twice / three times] as wide as it is tall and touching both ends. Bound papyrus hull painted deep blue-grey, deck carrying [piece2: a linen-wrapped shrine / piece3: three dull silver star-discs under netting]. Cold blue-greys, dull and unlit, value around #57534e. Both ends identically blunt — no bow, no stern, no steering oar, no pointed end.`
- **player** — `... the player's own is the sun barque, filling the strip and touching both ends. The right end rises into a pointed gilded prow crowned with a sun disc, unmistakably pointing right; gold hull, amber-gold cordage #f59e0b, blazing warm against the cold boats. Left end square and flat.`
- **wall** — `One square cell of a sealed stone gate-pylon of the duat standing in the sky, cut granite with a barred door, flush with the square, immovable. It must not resemble a boat, a star or a shrine. Cold pale grey stone, fills the whole square edge to edge.`

**The sky is a ground like any other**, which is worth saying because it is the one face whose ground is not
earth: §A.2's rule still governs it — one fixed square, no tiling, dark enough that the boats laid on top
read clearly.

### A.6 Post-touchup checklist

1. Key out `#FF00FF`, and **despill** — pull `r` and `b` toward `g` on what is left, or the object keeps a
   pink rim. A JPEG needs more of this than a PNG, so ask for PNG on anything that will be keyed.
2. **Crop to the whole silhouette, ends flush, no transparent margin.** Handles, runners and all.
3. Squash to the §A.2 ratio.
4. **Rotate 90° and look at it.** Any visible lighting direction means the art fails the shared-rotation
   trick and that face needs separate vertical art.
5. Export WebP at the §A.2 sizes into `src/assets/rushHour/<face>/`.

**Step 2 is the one with a real decision in it, and two other answers were tried first.** The object is
wider than its cells: a sledge's runners stick out past the deck that carries the cargo.

- **Crop to the deck** so the load-bearing body lands exactly on the cell lines. Geometrically perfect, and
  it saws the handles off every sledge — they look sawn off, because they are.
- **Let the handles overhang** — deck on the lines, sprite drawn wider than its box, runners hanging into
  the neighbour. Truest to the object, and it reads as clutter: a dozen pieces overlapping each other makes
  a board look jumbled rather than gridded, and the grid is what the player plans against.
- **Whole object inside its box**, which is what shipped. The deck stops a little short of the cell lines,
  and it does not matter: the player reads length off the sledge, not off the lines, because the handles
  are visibly part of the thing. Nobody looks at a cart and counts only the deck.

The §5 rule the first option was protecting still stands — art must not LIE about length — but a whole
object honestly drawn does not lie, it just uses its own outline as the ruler.

### A.7 The tag lands with the art

`puzzles/rush-hour.md` §5: a family withholds a role tag until it has a face that is somewhere rather than
nowhere — which is how `trade` waited for the market lane. **Add the art and the tag in the same PR** — art
alone leaves the tag unclaimed.

**And the tag alone does not put the face in front of a player.** A tag makes the family eligible for a
pool; a room only draws from that pool if a journey AUTHORS the role. So a face ships lab-only until
somebody writes `journey(...).pyramid(..., { encounter: "trade" })`, and `generatedWorld.ts` does not change
until they do. Worth knowing before promising rooms: the art PR is the cheap half.

### A.8 When the plain face goes

**Once the faces cover every role this mechanic can dress as, `default` stops being the mechanic undressed
and becomes the one face that looks unfinished beside the others.** Retiring it is three small things, and
the order is the point — none of them is worth doing before the art exists.

1. **Every face lands with its tag** (§A.7): `market` → `trade`, `archive` → `scribe`, `passage` →
   `funerary`, `barques` → `cosmos`, `quay` → `water`. A face and its tag in one PR, or the art buys no
   rooms.
2. **A room with no role hashes across the painted faces.** `skinFor`'s `?? SKINS.default` becomes a pick
   from the table by the board's own shape — the same number `faceFor` already uses to choose within a role
   — so plain puzzle rooms vary rather than all wearing the market lane. It stays in `skinFor`: `faceFor`
   goes on answering `"default"` and every other family is untouched, because a shared resolver is the wrong
   place to put one family's coverage.
3. **`default` deletes last** — its skin entry, its `themes` entry, and its locale block (a face is about
   fourteen strings in each language). Nothing outside `skins.ts` and `common.json` names it.

**What is lost with it is the CSS-shape board, and that is a real cost**: it is the only face that needs no
asset, so it is the one a new length, a bigger grid or a colour-blindness check can be tried against. Keep
the geometry it proved — length from the grid, a pointed nose on the player's own, a hatch on a wall — in
every painted face, which is what §A.4 and §A.5 already ask for.

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
