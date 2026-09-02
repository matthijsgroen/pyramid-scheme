# Spritesheet Renderer — Prep Notes

Future branch goal: replace the SVG primitive renderer (`SiteMapView.tsx`) with a
sprite-based tile renderer. Multiple themed sheets (desert, water, plants, cold stone,
amethyst, etc.), tile variants for visual variety, animated player sprite.

Nothing below is blocking. These are small quality-of-life changes to make the migration
cleaner when the time comes.

---

## Before starting the sprite branch

### 1. Propagate `theme` from DSL → FloorConfig → renderer

`theme?: Theme` already exists on `PyramidConstraint` in `dsl.ts` but is never written
into `FloorConfig` (`siteTypes.ts` / `worldGen/types.ts`) and never reaches `SiteMapView`.

- Add `theme?: string` to `FloorConfig` in both type files
- Have `configBuilder` copy `constraint.theme` onto the floor config
- Add a `theme?: string` prop to `SiteMapView` (ignored until sprites exist)

No visual change. The prop surface is ready when tileset loading arrives.

---

## Notes for the sprite branch itself

**Corridor tile lookup** — `dirs` (the N/S/E/W connection set) already encodes the full
bitmask needed to pick a wall/floor tile variant. 16 possible combinations, each maps to
a sprite index. No data changes needed.

**Tile variants for visual variety** — derive from `hash(row, col, siteId) % variantCount`
in the renderer. Deterministic, pure view concern, no grid data changes.

**Player animation direction** — facing comes off the movement vector of the step being walked, so there
is no stored direction to keep in sync with the route (`facingOf` in `ExplorerDot`). See "The explorer"
below.

**SVG → Canvas** — the switch is localised to `SiteMapView` and `ExplorerDot`. Nothing
outside those two files cares about the rendering primitive.

**Spritesheet manifest** — a simple `Record<theme, { url: string; tileW: number; tileH: number; map: Record<tileName, [sx, sy]> }>` passed as a prop or loaded via a hook. No game-data coupling needed.

**Room-space claiming (`buildRoomClaims` in `SiteMapView.tsx`)** — forks and dead-end
treasure/stairhead/exit rooms already claim extra grid cells as real footprint (box-first
3x3 including diagonals, falling back to an orthogonal flood-fill), purely derived at
render time from the finished `FloorGrid` — see the function and its comments for the
current rules, including the exception that absorbs a gate's one-cell approach corridor
into the junction's own footprint. This is exactly the shape a sprite-tile pass needs, and
the two per-cell values it needs are already computed today, just not carried as data yet:

- **Autotile role** — the `open: Record<Direction, boolean>` bitmask computed per cell
  (walls vs. openings) is already the Wang-tile/autotile index (e.g. "room top-left
  corner", "corridor straight", "room center"). Nothing new to derive, just needs to be
  exposed as a lookup key instead of directly driving rect/wall geometry.
- **`kind: "room" | "corridor"`** — already computed per cell for floor tinting. Doubles
  as the signal for where ambient overlays (dust puffs, light beams) and decorations are
  allowed to scatter — corridors should stay bare, rooms (including claimed cells) can
  carry them.

Still missing, needed before sprite selection can be theme-aware:

- **Area/ward styling** ("junior ward" reads as a noble wing, etc.) — cells already carry
  a `sectionHash` from generation tracing back to their DSL section, but that hash is
  currently just an opaque dedup key with no semantic meaning attached. Needs a lookup
  built once from `FloorConfig`, e.g. `sectionHash → { difficulty, theme }`, threaded down
  to the renderer alongside the `theme` prop from item 1 above.

Proposed shape when this is picked up: one more pure, unit-testable function alongside
`buildRoomClaims`, e.g. `selectTile(grid, claims, areaByHash, r, c) → { area, role, kind,
decoration }`, called once per cell and consumed by the sprite renderer instead of the
current inline rect/wall drawing. Rendering-layer only — no changes to `siteAssembler.ts`
or the `FloorGrid` data model.

---

## The art itself — how it is authored and found

Decided before any of it is drawn, because these choices are what make the second theme cheap
and the first prop lookable-at on its own.

**One tile is exactly the 56-unit cell** (`mapScale.ts`). Transparent background. Whether the art is pixel
art at 1:1 or painted at 2× and scaled down is **not settled** — see "The style is not decided" in
[tile-art-brief.md](tile-art-brief.md). Every size in this document is in map units, so the answer changes
the files and one line of the renderer (`ART_IMAGE_RENDERING`), and nothing else here.

**A prop sprite is 56 × 84 — a cell plus a face band — anchored by its BOTTOM edge on the cell's floor
line.** Props are painted after every wall, so a statue stands IN FRONT of the wall behind it and may be
taller than the cell it stands on; that band of headroom is the only thing that makes a statue, a pillar
or a shrine read as having height rather than as a decal on the floor. Short props leave the top band
transparent.

**A prop stands against a wall, and the player never walks on it.** Props only ever land on a genuinely
EMPTY claimed cell, so the cell a statue occupies is not walkable — there is no walking through it and
none behind it either. The claim it lands on is chosen for having VOID above it, so the headroom falls on
wall: over floor a statue would lean across ground the player walks, and the explorer dot — drawn later —
would pass in FRONT of its head. Half the props in the world stood that way until the preference existed;
what is left is the room whose only spare cell has floor above it, which keeps its prop anyway.

**One file per sprite, the filename as the key** — `src/assets/tiles/<theme>/<name>.png`, with
the names being the `DecorationKind` values in `siteTypes.ts` exactly. No coordinate manifest to
keep by hand: repacking into an atlas is a build step (`free-tex-packer-cli`, `spritesmith`,
TexturePacker CLI all emit a sheet AND its manifest), so it is worth adding only if the request
count ever measurably hurts, and when it is added the only thing that changes is the resolver.

**A theme is a set of OVERRIDES over `default`, not a second whole set.** A floor themed `desert`
that has its own sand but no statue of its own draws the default statue. Otherwise the second
theme costs as much to draw as the first, and the game ends up with six half-finished themes.

**Every sprite is optional, and a missing one falls back to the placeholder glyph** it has today
(`SiteMapView.tsx`'s `DecorationGlyph`). That is what lets the art land one piece at a time
rather than as a branch that has to be finished before anything can be seen.

**Fog stays an overlay, never a second set of art.** Four cell states tint every cell
(`roomFloorFill` / `corridorFloorFill`); a painted tile takes the state as a wash over it, or the
sheet count multiplies by four for no reading the player gains.

### Props first, floors second

Props (`RoomCell.decoration`, already placed by `siteAssembler` from the DSL's `decorations` pool)
need none of the plumbing above item 1: no theme, no autotile, no area lookup. Floors and walls
need the authored `theme` to reach the renderer first, and want one decision made before the art
is drawn: whether a floor material reads off `theme` alone, or off `theme` + `RoomCell.difficulty`
— the second is what "difficulty shown, not labelled" asks for, and it means a sand floor may need
a gentle and a wizard variant rather than one.

### Sprites on a puzzle board are a different bargain

Worth writing down because the answer differs per family and the reason is not obvious.

**On this map the art is decoration.** Walls, nodes and fog carry the rules and are drawn as
geometry on top, so a tile that reads slightly wrong costs nothing but looks.

**On a puzzle board the art is often the state.** A glyph is `currentColor` at 30–45px, recoloured
by its skin AND by hint state (evidence, focus, conflict, hatch, the completion animation), and
held to reading as a silhouette with no hue at all (`puzzles/star-battle.md` §8). One path serves
all of that; a sprite needs a file per skin per state. So the built families keep their paths.

**The exception is a family whose pieces are big and few** — rush hour's vehicles (§4.17 of
`PUZZLE_FAMILIES.md`) span 2–3 cells, which is 90–130px of real canvas, there are under a dozen on
a board, and only the target piece carries a state, which an overlay ring can say. Two costs to
weigh there rather than here: art that carries GEOMETRY has to be pixel-exact, since a hull ending
short of a cell boundary makes a 3-long piece read as 2 and the player deduces wrongly; and the
file count multiplies by skins × lengths × orientations where a path takes length as a prop.

---

# Floor & Wall Rendering — Decided Design

Everything above is the prep. This is the design the sprite branch builds.

## Perspective — top-down pixel dungeon, walls own their cells

The reference is the top-down pixel dungeon idiom (Craftpix's free 2D top-down dungeon pack is the
sample this was set against). The grid stays axis-aligned: screen X = col, screen Y = row. No
rotation, no Y-squash, no isometric transform. The angle lives entirely in the art.

**A wall is not an edge of a floor cell — it is its own cells.** The void the maze leaves between
passages _is_ the wall mass, and it draws nothing today. So:

- a **wall cell** is void that orthogonally or diagonally touches a lit walkable cell. Void beyond
  that is bare stone the map still draws nothing for
- it shows a **face**, a full cell tall (`WALL_H = CELL`), when the cell **below** it is walkable —
  that is the side you are looking at
- it is a **solid fill** otherwise — one dark token per tier, no art. The surface you look down onto
  carries nothing the player acts on: it is the mass the passage was cut out of, and flat dark
  separates it from a lit floor better than any texture. A one-cell-thick wall is therefore all
  face, which is exactly what makes it read as a wall rather than a ledge; you see the solid mass
  only where the wall is thicker
- the wall silhouette is **outlined in near-black** wherever it meets floor, and throws a **hard
  shadow band** onto the floor cell in front of its face

**A wall is never an edge — the pitch is stretched so every wall has a place of its own.**
Adjacency is not passage: a room claims the cells around it as footprint, so its floor can end up
flush against a corridor it has no way through to. Rather than squeeze a wall onto a zero-width
boundary (which reads as a different, thinner wall than a proper face), the layout gives every cell
a gap on its north and west side, and that gap is a place:

|           | size                | when the way is open             | when it is not                                                                                                                                                |
| --------- | ------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| north gap | `WALL_H` tall       | floor — the player walks through | a **face**, the side you look at                                                                                                                              |
| west gap  | `SIDE_W` wide       | floor                            | a side wall, seen edge-on: only its thickness shows                                                                                                           |
| corner    | `SIDE_W` × `WALL_H` | —                                | part of the band only inside a room’s own width; at a band’s end the side wall runs toward the viewer, so it stands in FRONT and its own top takes the corner |

So `ROW_PITCH = CELL + WALL_H` and `COL_PITCH = CELL + SIDE_W` (mapScale.ts), every face in the map
is exactly `WALL_H` tall, and a back wall runs unbroken across as many cells as it spans. Without
this a gate chamber reads as something the player can simply walk around, which is how the first
pass looked.

**`WALL_H` must divide `CELL`.** The face texture repeats on the face height, so a face only lands
on the pattern's origin if the row pitch is a whole number of faces. At `WALL_H = 21` each row
sampled a different slice of the art and the dark ones came out as black slots in the wall.

**Give every pattern `<image>` `preserveAspectRatio="none"`.** An `<image>` letterboxes itself by
default, so art whose aspect differs from the tile is drawn centred with the rest of the tile left
transparent — which paints brick across the middle of the map and nothing at either end. This one
cost two rounds of screenshots to find, because the geometry looked perfect.

**The floor is nearly flat.** Three values a step apart, a 1px joint, scattered chips and hairline
cracks. All the depth comes from the faces, the outline and the shadows — a floor carrying its own
per-slab highlights and shadows reads as a stack of ledges, which is the failure the first dummy
pass walked into.

Because walls live on void cells, floors keep their whole cell: hit testing, `useMapZoom`, the
scroll-to-explorer maths and `buildRoomClaims` are untouched, and a `NODE_RADIUS_LARGE` icon is
never covered — void cells carry no node icons.

True isometric was rejected: it costs hit testing, claim shapes, scroll maths, a wall sprite per
orientation and occlusion sorting, and a rotated maze reads worse, not better.

### If it is pixel art, this is the one thing it costs

The placeholders are **pixel art at one tile = one cell = 56px**, 1:1 at zoom 1. A painted set at 2× is still
open (see the brief); what follows is the cost of the pixel answer.

The cost, and the only place this reaches outside the renderer: crisp pixel art needs
`image-rendering: pixelated` and **integer (or half-integer) zoom steps**, so `useMapZoom`'s smooth
continuous zoom has to snap. That is a real change to a shipped interaction — decide it before the
art is commissioned, because a painted set at 2× would keep smooth zoom instead.

## Large tiles, cut per cell — a world-aligned pattern, not a slicer

No slicing code. One big image per tier in an SVG `<pattern>` with `patternUnits="userSpaceOnUse"`,
aligned to the world grid:

```
<pattern id="floor-expert" width={CELL*8} height={CELL*8} patternUnits="userSpaceOnUse">
  <image href={floorMega} width={CELL*8} height={CELL*8}/>
</pattern>
```

Any cell filled from it continues its neighbour's texture automatically — that is the whole point
of aligning the pattern to the grid rather than to each cell. Repetition period is 8 cells (a 448px
megatile); maps run 15–31 cells across, so 2–4 repeats, and a feature drawn _across_ cell
boundaries (a long crack, a stain spanning three cells) is what kills the tiled read. The masonry
in the megatile is deliberately laid at a size that does **not** divide the cell — 64×32 slabs
against a 56 cell — so the bond only realigns with the grid at the megatile's own period.

Two patterns per tier: `floor` (`CELL*8` square) and `wall-face` (`CELL*8` × `WALL_H`). A wall top
needs neither — it is a solid fill. Because `WALL_H` is exactly `CELL`, every cell row lands on the face
pattern's own origin, so the cap-light / base-dark registration comes out identical on every face
with no per-row transform.

Then stop drawing a rect per cell. Build **one union path per `CellState`** for each of the three
regions and fill it from its pattern:

```
floor:      4 <path fill="url(#floor-expert)"/> + 4 <path fill={stateWash}/>
wall mass:  4 <path fill={tier.wallSolid}/>
wall faces: 4 <path fill="url(#face-expert)"/>  — one quad per wall cell with floor below
```

~900 `<rect>` collapse to a couple of dozen fills. Fog stays an overlay wash over the same paths —
never a second set of art. The near-black silhouette is one stroke on the wall region's own
outline, and the face's floor shadow is one more path.

This makes the per-cell autotile index sketched earlier in this document unnecessary: faces and
tops are quads, and the outline carries the corners. Add real corner sprites only if they visibly
read wrong.

Canvas stays off the table. DOM node count was the only reason to want it, and the union path
removes it.

Built, in two pure modules plus the view:

- `tileRegions.ts` — `buildTileRegions(rows, cols, floorAt, openBetween)` sorts every rectangle of
  the stretched layout into `floorRoom`, `floorCorridor`, `wallMass` and `wallFace` per `CellState`,
  and `rectsToPath` / `faceShadowsToPath` turn a group into one `<path>`. It knows nothing about SVG,
  claims or fog: the caller answers per cell with `{ state, kind }`, `"unlit"` or `"stone"`, and per
  edge with whether it can be walked.
- `mapScale.ts` — the one place that maps a cell to pixels (`cellLeft`, `cellTop`, `cellCenter`,
  `mapWidth`, `mapHeight`). `SiteMapView`, `ExplorerDot` and the specs all read from it, so the pitch
  can change in one edit.
- `tileMaterials.ts` — the tier palettes (shared with the dummy-art generator, so the two cannot
  drift), the per-state washes and the corridor shade.
- `tileAssets.ts` — `tileUrl(tier, name)` over an `import.meta.glob` of `assets/tiles/*/*.png`, so
  adding art is dropping a PNG in. A missing file falls back to `default`, then to the glyph.

`SiteMapView` keeps every per-cell `<g>` for interaction, icons and badges; only the floor and wall
painting moved out. `FloorTile` went with it. The old `isOpenSide` survives as `isPassable`, asked
only about two cells that are both drawn floor: it decides whether the gap between them is floor or
wall, and it is the only edge question the model asks.

**An unlit passage is walled, and open only at its mouth.** Leaving its whole length undrawn traced
the corridor — a channel through the stone whose direction and length read off the map without anyone
walking it. The mouth (the one gap where lit floor meets it) stays open, which is all that "the way
carries on" ever needed.

**The ground is stone, not void.** A pyramid is carved out of rock, so everything the map has not lit
is the tier's own dark stone. Two things fall out of that: the shape of the drawn stone can no longer
trace anything, and a pocket enclosed by a thick wall stops reading as a hole punched through it. Wall
mass is that same stone plus the state wash, so rock beside explored floor carries a little more
weight than rock nobody has seen.

**Stone reaches exactly one cell from lit floor.** A wall rect is lit by the floor it TOUCHES; asking a
3×3 around two cells at once reached two cells out and drew a band around every corridor twice as
thick as the wall it stood for.

**The silhouette stroke goes UNDER the fills.** Stroked on top it traces every cell's own border and
lays a grid over the floor; underneath, only the outward half survives, which is exactly the
silhouette.

## What keys the art

`theme` in `dsl.ts` is a **puzzle skin name** (`"night"`), not floor art. It is not hijacked.

| Layer                                     | Keyed by                                                             |
| ----------------------------------------- | -------------------------------------------------------------------- |
| Floor + wall material                     | `FloorGrid.difficulty` — the floor's own tier, one pattern per floor |
| Wall dressing, prop pool, light colour    | per-room `RoomCell.difficulty`                                       |
| Mood overlay (the hour)                   | `theme` — one wash and one light colour, never a second art set      |
| Freestanding props                        | `RoomCell.decoration`, resolved as `tiles/<tier>/<kind>.png`         |
| WHICH prop or wall item, out of that pool | the room's `role` — the place it is (journeys.md §2)                 |

Floor material follows the floor tier, not the room's, so a mixed-difficulty floor can never
produce a material seam mid-corridor. Section difficulty is read off the wall dressing, prop
density and light instead — which is what "difficulty shown, not labelled" actually asks for.

Tier hues follow `ui/atoms/tombImageMap.ts` (stone → sandstone → slate → gold → emerald) so the
tomb backdrop and the floor art agree.

Props anchor **bottom-centre at the cell's floor line** so they stand, rather than being centred
like today's `DecorationGlyph`, and their sprite carries a face band of headroom above the cell so a
tall one has somewhere to be.

**The rank says what a tomb is furnished WITH; the role says which of it this wing shows.** A role is the
place a stretch of floor is (journeys.md §2), so a trade wing stacks amphorae on shelves and a funerary
one holds a coffin and a false-door stela — out of the same rank pool. The tag lives on the KIND
(`worldGen/dressingRoles.ts`), never in a pool per rank × role: a rank stays one authored line, and the
narrowing is a gen-time pass so `generatedWorld.ts` records the pool a wing actually draws from. Three
rules keep it from making the world duller than it was:

- **An untagged kind fits anywhere** — rubble, a pillar, a chest, a mat, a pit. They survive every
  narrowing, and they are what stops a pool from collapsing.
- **A role that names no place narrows nothing.** `puzzle` is the default a room with no authored place
  gets, and `trap` says what is IN a room rather than where it is. Narrowing on `puzzle` took the
  statues, jars and shelves out of most of the world.
- **A pool of one is fine when that one thing IS the place**, and a pool left with only the kinds that
  belong nowhere stays whole. A necropolis where every dead end holds the same coffin, or a scriptorium
  where every statue is the same Osiris, is a place asserting itself — real tombs repeat. A wing where
  every fork holds rubble says the furniture went missing. So the test is not how MANY kinds survive but
  whether any of them speaks to this place. The repetition is exact, since a kind is one sprite per rank;
  if that ever reads as copy-paste rather than as a place, the fix is sprite variants behind the same
  kind, not padding the pool with furniture the place would not have.

## Ward-gate seams

Material only ever changes at a **gate → stairhead** pair (§6: every ward gate leads to exactly
one stairhead).

1. The gate cell keeps the material of the side being left.
2. The stairhead cell starts the new one.
3. A `threshold` sprite sits on the shared edge — a stone sill. The change is authored, never
   accidental.
4. Every tier shares the same mortar-dark and the same lamp-warm. Only the stone changes.
5. The five ranks are one ladder — merchant → nobleman → priest → pharaoh → gods — so any two
   adjacent tiers differ by a single step of wealth and any seam is plausible. A gate from a
   nobleman's wing into a priest's is a door between two parts of one necropolis; a gate from a
   merchant's cellar straight into the gods' vault would not be, and the ladder is what stops the
   art from being asked for that.

## The explorer — a person, not a rank

The art is **shared, in `tiles/default/`** (`sharedTileUrl`), never per tier: one person walks down all
five ranks, and a rank dresses the place rather than the player.

**Three files, not four** — `explorer-s`, `explorer-n`, `explorer-e` at 40 × 48, bottom-anchored on the
cell's floor line so the figure stands in its own square. Facing west is facing east mirrored with
`scale(-1, 1)`, which is the whole reason for three. Facing itself is derived from the step being walked
(per segment, so a route that turns turns the figure), and rest faces south — met face on.

**With no art present it falls back to the dot the map had before**, so no look is locked in by the
plumbing: dropping three PNGs in swaps the character, deleting them takes it back. `ExplorerFigure` is
split out from the walking for exactly that reason, and the **Facings story** draws all four facings at 1:1
and 3x over pale limestone and black granite — the two grounds a figure has to read against.

It draws over a room's node icon (a character standing on a cell hides some of what the cell says) and
under an arch, which is the one thing in front of it.

## Archways — the one thing painted over the player

**An arch marks a PLACE, so placement is the whole of it** (`doorwaysFor` in `SiteMapView`). Three rules,
each one there because breaking it looked wrong:

- **A chamber, not a station.** One side of the gap has to be part of a room's FOOTPRINT — a claimed cell
  or the room that claims it. An encounter node on the path is a single cell that claims nothing, and
  arching those put a gateway either side of every puzzle in the world: a corridor with doors across it
  every second step. A doorway is where a place begins, and a footprint is what marks one.
- **Exactly one side.** Two footprint cells are the middle of one room, and neither being a chamber is a
  corridor with no door in it.
- **A hole in a wall RUN.** The bands either side of the opening must be wall, so the jambs have corners
  of masonry to stand on. Where a chamber's own floor wraps around the mouth of its corridor there is no
  wall beside the opening, and an arch there would stand on nothing.

That comes out at 3 to 11 arches a floor, ~8 on average, at forks, treasure chambers, stairheads, exits
and gates. Ignoring the footprint gave 20 a floor, most of them around puzzle nodes.

The sprite is `tiles/<tier>/arch.png` at `ARCH_W` × `ARCH_H` (84 × 56) with its middle transparent, so the
floor of the way through shows beneath it. It is a corner WIDER than the doorway on each side, because the
jambs stand in those `SIDE_W` corner slots — the wall's own thickness, where a jamb belongs — leaving the
way through a full cell wide for the 40-wide figure to walk between them rather than behind them. It is cut from the
stone of the BAND it interrupts (the south cell's tier, the same rule `tileRegions` colours that band by),
so a gateway belongs to the wall it pierces rather than being imported into it — a grey starter arch in a
junior wall reads as a doorway from the wrong tomb.

**A gap gets one piece of masonry.** At a ward gate the rank changes across the doorway, and that gap was
already carrying a sill (§ Ward-gate seams) — so the map laid a sandstone threshold inside a grey gateway,
with the gate's own icon under both. The arch wins: it says everything the sill says and says it standing
up, in the same stone the sill would have used, so the renderer skips a sill in any gap an arch stands in
(`archedGaps`). The seam itself is untouched in `tileRegions` — the geometry still knows where the material
changes, and a seam with no arch still lays its sill.

**It grows out of the band in both directions, and that is a scale decision rather than a drawing one.**
Confined to the band, the clear opening under the lintel came out 22 against a 48-tall explorer — nothing
ever overlapped, since the band sits between two rows and the figure inside its own cell, but a doorway
half the height of the person standing in it cannot be believed whatever the projection says. So the crown
stands `ARCH_RISE` proud of the wall and the jambs come `ARCH_DROP` down onto the floor of the way
through, which is where a real jamb stands: opening 46, clearance 40 above the head.

Growing it upward alone would have bought the same opening and cost the cell BEYOND the doorway — an arch
paints over everything, so height above the wall eats the ground behind it (half a cell, and half of any
node icon there), while height below eats only the doorway's own floor edges, which nothing else uses.

**It is painted last, over the explorer.** Everything else on the map is under the player; an arch is the
one thing in front, because that is what makes it a thing in the world rather than a decal — the player
walks under it. Which is also why it FADES (0.35) while they stand in the doorway, on either of the two
cells it spans: an arch that hid the player would be a wall, and a doorway is not. Nothing else on the
map dims, so the fade reads as this doorway rather than as a lighting change.

Both sides have to be drawn floor, so an unexplored way through carries no arch — an arch is a thing you
can see, and the fog is what you cannot.

## Whose tomb it is — the tier ladder

A tier is a **rank**: whose tomb the player is robbing. The catalogue already asserts the ladder, tier
by tier, in the names of the tombs themselves (`journeys.md` §4–§8) — Forgotten Merchant's Cache,
Noble's Hidden Vault, High Priest's Treasury, Hall of Osiris, Vault of the Gods. The art follows the
fiction rather than inventing a second one.

| Tier    | Rank         | Material (matches `ui/atoms/tombImageMap.ts`) |
| ------- | ------------ | --------------------------------------------- |
| starter | **merchant** | limestone chips and mudbrick, whitewash       |
| junior  | **nobleman** | dressed sandstone, plaster, ochre paint       |
| expert  | **priest**   | basalt and granite, sunk relief               |
| master  | **pharaoh**  | black granite, gold leaf, faience tile        |
| wizard  | **the gods** | calcite and quartz, starlight                 |

**Rank is not role.** A role (`encounter: "trade"`, `"funerary"`, `"cosmos"` …) says which PLACE a room
is, per `journeys.md` §2, and any rank of tomb can hold a merchant's cellar or a scriptorium. Rank is
what the building is made of and who furnished it. The two are authored separately and neither reads
the other.

### Three things a tier dresses

1. **Floor** — one megatile per tier. What the player walks on, kept low-contrast.
2. **Wall** — continuous dressing painted INTO the wall-face megatile: plaster, courses, hieroglyph
   columns, mural registers, soot, banding. Background, never a per-cell decision.
3. **Chamber props** — `RoomCell.decoration`, one per claimed room cell, from an authored pool.
4. **Wall items** — `RoomCell.wallDecoration`, drawn into that cell's face band: the bounded things
   that hang ON a wall rather than pattern it.

### A megatile carries material, never objects

**The megatile does not register to cells, and cannot be made to.** The pattern's period is 448 while
the layout pitch is `COL_PITCH` 70 by `ROW_PITCH` 84, so alignment recurs only every
LCM(70, 448) = 2240 units — 32 cells — across, and every 16 rows down. A mat painted inside one cell
of the art therefore lands at a different offset in every cell it is drawn into: sometimes centred,
sometimes sawn in half by a wall or a doorway.

So the test for anything going into a megatile is whether being cut by a wall still reads right.

| Safe in a megatile                                           | Why                                                          |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| masonry bond, veins, cracks, stains, dust, chips, tool marks | a cut reads as stone continuing under the wall               |
| inlay bands, courses, inscription columns, mural registers   | a band interrupted by a doorway is what real tombs look like |

| Not safe — needs a cell of its own                               | Why                                                            |
| ---------------------------------------------------------------- | -------------------------------------------------------------- |
| reed mat, rug, jar stand                                         | an outline the player expects whole; half a mat reads as a bug |
| stela, wall niche of goods, mirror sconce, veil rail, star shaft | the same, on a wall — these are `wallDecoration`, not art      |

There is one way to paint furniture straight into the art: author the megatile at the LAYOUT pitch —
8 cells including their wall gaps, so 560 × 672 — which registers to the grid exactly and forever.
The cost is that the art is then tied to `WALL_H` and `SIDE_W`, so changing the wall height means
redrawing every floor. Not worth it for mats; worth reconsidering only for tile panels fitted to a
chamber.

### Floors

| Tier     | Floor                                                                                               |
| -------- | --------------------------------------------------------------------------------------------------- |
| merchant | trodden earth over limestone chips, spilled grain and chaff, jar rings, tally scratches             |
| nobleman | dressed limestone slabs, painted ochre banding, plaster patched at the joints                       |
| priest   | dark basalt paving, natron dust, a water channel cut along one side, hollows worn at the thresholds |
| pharaoh  | black granite with faience-tile inlay bands, alabaster panels, gold leaf in the joints              |
| the gods | polished calcite lit from beneath, star-field inlay, seams that stop mid-slab, no dust at all       |

### Walls

Two columns, because they are made differently: the dressing is texture inside the megatile, the
items are `wallDecoration` on a cell.

| Tier     | Dressing (in the megatile)                                                                                   | Items (`wallDecoration`)                                               |
| -------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| merchant | mudbrick courses, flaking whitewash, tally marks and merchant seals, peg holes, awning brackets              | **niche of goods**, hanging scales, tally board                        |
| nobleman | full plaster, procession murals — banquet, hunt, granary — painted dado band                                 | **false-door stela**, lamp niche, linen hanging                        |
| priest   | sunk-relief columns of hieroglyphs, mud-brick plugs with cord seals, censer soot, a star band at the ceiling | **veil rail and veil**, hanging lamp, wall shrine, cord seal on a plug |
| pharaoh  | gilded panels, cartouche friezes, electrum banding, faience tile registers                                   | **bronze mirror sconce**, gilded mask, offering niche                  |
| the gods | seamless ashlar with no tool marks, inlaid constellations, light leaking from the joints                     | **star shaft** — a slot looking out on the night — crystal bracket     |

### Chamber props

**The full commission list — every file, named specifically, per rank — is
[tile-art-brief.md](tile-art-brief.md).** This section is the mechanism; that document is what to draw.

A kind is a **silhouette**; the tier is its skin, resolved as `tiles/<tier>/<kind>.png`. That is what
keeps the fifth rank from costing as much to draw as the first. A `—` means that tier's pool does not
author the kind, so no sprite is needed.

| Kind                                 | merchant                                 | nobleman                    | priest                              | pharaoh                   | the gods                         |
| ------------------------------------ | ---------------------------------------- | --------------------------- | ----------------------------------- | ------------------------- | -------------------------------- |
| `shelf` **new**                      | mudbrick shelving, goods stacked         | linen press                 | scroll shelf                        | tribute shelf             | ledge of grown crystal           |
| `chestProp`                          | wooden chests and reed baskets           | sealed chest, wax seals     | relic box                           | gilded chest              | reliquary of light               |
| `jarRack`                            | **wine and oil amphorae**, mud-stoppered | estate jars, labelled       | canopic jars                        | sealed gold vessels       | vessels holding nothing          |
| `offeringTable`                      | market table, scales and weights         | dining table laid out       | **altar**                           | tribute laid in state     | a slab with no supports          |
| `basin` **new** (renames `fountain`) | water jar on a stand                     | ablution basin              | **sacred pool**, steps down into it | libation basin, alabaster | pool with stars in it            |
| `statue`                             | uncarved blank, part-paid for            | painted limestone ka-statue | god-figure, offerings at its feet   | gilded colossus           | figure made of light             |
| `lamp` **new**                       | single wick lamp                         | lamp stand                  | **tall lamp stand, oil-fed**        | gilded lamp tree          | lights with nothing holding them |
| `hanging` **new**                    | awning cloth                             | linen hanging               | **veil before the shrine**          | gold-shot curtain         | a curtain of aurora              |
| `shrine`                             | goods niche                              | false-door stela            | naos, doors shut                    | gilded shrine             | **a window on the cosmos**       |
| `sarcophagus`                        | —                                        | wooden coffin               | priest's coffin, corded             | gold-inlaid, lid ajar     | open, empty, radiant             |
| `pillar`                             | timber prop holding the roof             | palm column                 | papyrus column                      | gilded column             | column of light                  |
| `brazier`                            | cold ash                                 | lit, smoking                | censer, incense                     | gold, burning low         | cold light, no flame             |
| `rubble`                             | mortar spill                             | swept pile                  | collapsed plug                      | —                         | stone shattered from within      |
| `pit`                                | cellar shaft                             | —                           | robbed-out hole                     | —                         | a shaft with no bottom           |
| `crystal` **new**                    | —                                        | —                           | —                                   | —                         | calcite cluster, lit from inside |
| `mat` **new**                        | reed matting, frayed                     | reed mat, dyed border       | rush mat before the altar           | —                         | —                                |

### Four swaps from the brief, and why

The asks were right about the register and wrong about the millennium in four places:

- **barrels → amphorae.** A coopered barrel is Roman-era Celtic technology, a thousand-odd years late.
  Egyptian wine travelled in pottery amphorae with mud stoppers, stacked or racked — which is a better
  prop anyway, because a rack of jars reads as inventory at a glance.
- **carpets → reed matting**, and matting is a PROP, not a floor material. Knotted pile carpet is
  Persian and later; woven rush matting does the same job of softening a floor. It cannot live in the
  megatile, though — a mat has an outline, and the megatile does not register to cells, so walls would
  saw it in half (see "A megatile carries material, never objects" above). Painted floor banding is
  the part that stays in the art, because a band cut by a wall reads as continuing under it.
- **chandeliers → hanging lamps.** No chandelier, but hanging oil lamps on chains are real, and they
  are the priest tier's light source. A hanging lamp is a wall item; `lamp` is the standing kind, and
  it is the one prop that emits.
- **fountains → basins.** No pressurised fountains. A libation basin, an ablution basin and a temple's
  sacred lake cover it, which is why `fountain` should be renamed `basin` — a one-line change to
  `DecorationKind`, cheap because nothing authors it yet.

Kept as asked: shelves, crates, stone statues, altars, pools, curtains, golden statues, tilework,
sarcophagi, crystals, and windows that look out on the cosmos — the last of which is the same star
shaft `journeys.md` already names for the Great Pyramid.

### What is authored, and what is not

Every rank names a pool now, one line per tier spec, in the kinds that exist today:

```ts
tier("starter", { difficulty: "starter", decorations: ["chestProp", "rubble", "pit", "pillar", "fountain"] })
```

`decorations` reaches a whole site from `PyramidConstraint`, cascades onto every floor
(`buildSite.ts`) and is inherited by side sections the way a theme is (`sideSections.ts`'s
`wearSiteRole`) — a fork on a side path is exactly where a prop goes, so a pool that stopped at the
main path would dress almost nothing. It is a free field: `yarn verify-floors` passes unchanged, and
`worldContentHash` is the only thing in the generated world that moves.

**Which prop a room draws is picked by WHERE the room is** — `hashString(siteId:decoration:row,col)`
modulo the pool. A per-pool counter reads as equivalent and is not: the generated world gives every
section its own pool literal, so each counter restarted at zero and every fork in the world held a
crate. `propPlacement.spec.ts` guards both halves — that props land at all, and that no single kind
takes more than 60% of them.

`wallDecoration` is authored the same way, from its own `wallDecorations` pool: a second optional
kind beside `decoration` on `RoomCell`, picked by the same positional hash under its own salt, and
drawn into a face band instead of on the floor. It earned its keep here rather than being deferred,
because the stela, the goods niche and the star shaft are the signature items of three of the five
ranks, and none of them can be painted into art.

Every rank authors a wall pool of two or three items, from the Walls table's own Items column — a
merchant hangs a niche of goods and a tally board, the gods hang a star shaft. `propPlacement.spec.ts`
guards the wall items the same way it guards the props, plus that each one lands inside its own room's
footprint.

Build order, each step visible on its own:

1. ~~`decorations` pools per tier~~ — **done.** Every rank authors what its own table names.
2. ~~the new `DecorationKind` values and the `fountain` → `basin` rename~~ — **done.** Sixteen kinds.
3. ~~a sill where the rank changes~~ — **done.** `StateGroups.threshold`, drawn from the entered tier's
   `threshold.png`.
4. ~~`wallDecoration`~~ — **done.** Eight kinds of their own (`niche`, `stela`, `sconce`, `veil`,
   `starShaft`, `wallShrine`, `tallyBoard`, `mask`), a `wallDecorations` pool per rank cascading exactly
   as `decorations` does, and `wallItemsFor` in `SiteMapView` as the anchor: the face band of the first
   cell of the room's footprint that HAS a face — its own cell, then its claims. It asks
   `tileRegions.hasWallFace`, the same predicate the band itself is built from, so anchor and band
   cannot disagree. A room with no face anywhere in its footprint carries no wall item, which is also
   what keeps one off a fogged room: fog reads as unlit passage, and an unlit gap has no band. The
   sprite is `tiles/<tier>/<kind>.png` at `CELL` × `WALL_H` — the band's shape, not a square — and the
   band's own state wash is laid back over it, so an item is never brighter than the wall it hangs on.
5. the art, one rank at a time, starting with whichever rank the player meets first. `make-seamless`
   handles the two megatiles; props and wall items need no treatment.

## Tools and fixtures

- `yarn generate-dummy-tiles [--preview]` — rewrites every placeholder tile, deterministically: the
  same tier always rasterises to the same bytes. `--preview` also writes `tiles/preview.png`, a dry
  run of the renderer over a hand-written plan, five ranks side by side.
- `yarn generate-dummy-tiles --palettes` — candidate palettes for a rank, each drawn on the SAME plan, with
  the gold click marker, the five key colours, the fog wash and the rank's mood tint laid over them, plus a
  contrast table on stdout whose floor is what the shipping ranks already manage. Colour cannot be judged as
  swatches: a wall and a floor at similar VALUE blur however different their hues are. Writes
  `tiles/palette-test.png` (git-ignored).
- `yarn make-seamless [--axis=both|x|y] <file>` — makes art tile that was not drawn to. See above.
- Three stories render REAL generated floors, which is the only way to see authored content: the
  hand-built story configs carry no pools. `WorldFloorStarter` is starter_1, deliberately, because its
  ward-chest teasers are junior — a floor built of two ranks. `WorldFloorUnexplored` is the same floor
  part-explored, for judging what the fog gives away. `WorldFloorMaster` is the dark end of the ladder.
- The specs that hold the invariants, rather than the details: `tileRegions.spec.ts` (which rectangle
  is floor and which is wall), `floorMaterial.spec.ts` (a floor is built of its sections' ranks),
  `propPlacement.spec.ts` (props land, spread across the pool, never in a walkway) and
  `clickTargets.spec.tsx` (every target the map offers is standable AND walkable, over eight seeds and
  a forty-step walk). The last one is the harness that found the tap bug; reach for it first when the
  map offers something it should not.

## Decisions taken, so they are not reopened

- **Zoom stays smooth.** `useMapZoom` is not snapped. Playtesting found no real problem with pixel art
  softening at off-integer zoom, so the art is not bound to strict pixel discipline — which gives a
  generator more room than a hard 56px grid would, and is one less thing riding on the pixel-or-painted
  question.
- **The floor material is per SECTION, not per floor.** A pocket gated behind a junior key is junior
  stone inside a starter pyramid. `FloorGrid.difficulty` is the floor's own tier and is only the
  fallback; `RoomCell.difficulty` / `CorridorCell.difficulty` carry each cell's section tier.
- **The ground is stone, not void**, and an unlit passage is walled except at its mouth. Neither the
  drawn stone nor a marker may give away a passage the player has not walked.

Still open, and both want an answer before a rank is drawn:

- **`SIDE_W`** is a quarter cell, which reads thin against a full-cell face. Widening it is free — the
  pitch already accounts for it — but `WALL_H` is not free: it must divide `CELL`.
- **Pixel art, or painted at 2× and scaled down.** The only open question with a code line attached
  (`ART_IMAGE_RENDERING` in `tileAssets.ts`); everything else is written in map units so it does not care.
  A painted set judged through `"pixelated"` will look crunchy and the art will get the blame.
- **Whether a rank needs its own props at all** where the doc's table says `—`. The dummy generator
  draws all sixteen for all five ranks so authoring never waits on it; a real art pass should draw
  only what a pool authors.

## Mood settings

One row of data per tier, all of it overlay — never extra art. **Built** (`moodSettings.ts`, `MapMood.tsx`),
and three mechanisms carry every mood there is a name for:

| the mood           | the mechanism                                                       |
| ------------------ | ------------------------------------------------------------------- |
| night              | `tint` — one colour over the whole map                              |
| sand               | `drift` — many small motes, quick, blown across                     |
| fog                | `drift` — a few huge soft ones, slow. Same mechanism, other numbers |
| dust, soot, sparks | `drift` again, per rank                                             |
| scarabs scurrying  | `life` — sprites on lit floor                                       |

Sand and fog being the same mechanism is the point: one drift field with a size and a pace covers chaff,
soot, incense haze, glinting dust, sparks, a sandstorm and a fog bank, where one idea per name would have
been six.

**Keyed by the floor's `theme` over its rank's own ambience.** The rank rows below are what a floor wears
unthemed — no floor is airless — and a theme replaces only the keys it names, so a night merchant's cellar
keeps its dust and its scarabs and only the light changes. A theme the map has no weather for (most of
them: `theme` is a puzzle skin first) leaves the rank's air alone. `FloorGrid.theme` carries it, the way
`FloorGrid.difficulty` already carries the rank.

**All of it is CSS animation, and all of it stops under `prefers-reduced-motion`.** A mote driven from
React would cost more per frame than everything else the map draws; the compositor moves a hundred for
nothing. Positions are hashed off the site id so the air is the same every time a floor is drawn — but
mix the hash before reducing it (`hashString` is `h * 31 + char`, so consecutive indices hash one apart,
which put all three scarabs on the same tile).

Scarabs sit UNDER the props and icons, because they are on the floor; drift and tint sit over everything,
arches included, because weather is between the player and the world.

**A scarab picks its cell out of every floor cell the floor has, lit or not**, and is simply not drawn while
that cell is dark. Picking out of the EXPLORED cells looked equivalent and was not: the list grows as the
player reveals the map, so every index into it lands somewhere else and the beetles teleport across the
floor each time a corridor opens up. Anything positioned by an index into a list has to index something the
game cannot lengthen — which is the same trap as the per-pool prop counter (§ "What is authored"), one layer
down.

| Rank         | Ambient tint    | Ambient  | Light                          | Flicker    | Contrast  | Particles       |
| ------------ | --------------- | -------- | ------------------------------ | ---------- | --------- | --------------- |
| **merchant** | dusty warm-grey | high     | daylight down the stair        | none       | low       | chaff and dust  |
| **nobleman** | warm ochre      | mid      | oil lamps in the niches        | strong     | mid       | soot flecks     |
| **priest**   | cold blue-grey  | low      | hanging lamps, far apart       | weak       | high      | incense haze    |
| **pharaoh**  | near-black      | very low | gold catching a single lamp    | none       | very high | glinting dust   |
| **the gods** | starlit blue    | low      | the walls themselves, no flame | slow pulse | mid       | drifting sparks |

## Bringing in art that was not drawn to tile

A generated image does not tile, and the two megatiles have to. `yarn make-seamless <file>` does the
standard fix, so it is a command rather than hand-work:

1. Shift the image by half its size, wrapping — a diagonal quadrant swap. The outer edges are then
   seamless BY CONSTRUCTION, because they used to be the middle, and every seam has collapsed into a
   cross through the centre.
2. Lay the untouched original back on top through a soft mask. Its centre is clean, so it covers the
   cross with matching content.

`--axis` is not optional to think about. A floor tile repeats both ways and wants the full
treatment. A wall FACE repeats only horizontally — its top is the cap catching light and its bottom
the dark base — so a vertical shift would destroy the registration that makes every wall in the map
read alike. Use `--axis=x` for it, and the patch becomes a vertical band rather than a disc.

It has one honest limit: a texture with a global gradient across it cannot be made to tile without a
crease somewhere, because a monotonic ramp has to turn around. Stone has no such ramp, so the creases
do not appear — but a tile lit brightly on one side will show one, and that is the art to reject
rather than the tool to blame.

So the route in, for each file: generate → `make-seamless` (megatiles only) → drop it in at
`src/assets/tiles/<tier>/<name>.png`, at the size the slot expects. The resolver is an
`import.meta.glob` by filename, so nothing else changes and one file can land at a time.

## Dummy sprites — rasterised SVG, for testing the pipeline

`yarn generate-dummy-tiles` (`scripts/generateDummyTiles.ts`) writes a full placeholder art set
into `src/assets/tiles/<tier>/`: generated SVG rasterised by `sharp`, which is already a
dependency. Nothing hand-drawn, nothing precious.

Per tier: `floor.png` (448², = 8 cells at 1:1), `wall-face.png` (448×56), `threshold.png` (56×12),
one 56×84 PNG per decoration kind — a cell plus its headroom — and one 56×28 PNG per wall-item kind, the
band's own shape. A wall top is a palette token, not a file.

The dummies deliberately carry the things that are hard to judge from a mockup:

- features that **cross cell boundaries** — a long crack, multi-cell stains, a dead-straight inlay
  line — so a tiling seam or a half-pixel pattern offset shows up as a kink
- masonry laid at 64×32 against a 56 cell, so the bond is visibly _not_ on the cell grid
- face courses offset half a block per row, running unbroken across cell boundaries — the thing a
  per-cell wall sprite cannot do
- a contact shadow and a near-black outline on every prop, and a few kinds (statue, pillar, shrine,
  sarcophagus) deliberately reaching up into the band's headroom, so height can be judged against a real
  wall face rather than against a swatch

`yarn generate-dummy-tiles --preview` also writes `src/assets/tiles/preview.png`: a **dry run of the
renderer**, not a swatch sheet — a hand-written plan (a ring corridor around a sealed chamber) drawn
with the same world-aligned patterns and the same wall rules, five tiers side by side.

Two failure modes this preview caught, both worth keeping in mind when reviewing real art:

- drawing a wall strip on **every** cell row, rather than only on closed edges, reads as an
  elevation — four horizontal ledges — and says nothing about the top-down read
- a wall top and a lit floor at similar value blur into each other. The near-black silhouette
  outline is what separates them, not the textures

They are **committed**, because the renderer draws them: art the map depends on cannot be a local
artifact, or the same build renders differently on two machines and the tests follow. Only
`preview.png` stays ignored. Regenerating overwrites them deterministically — same tier, same bytes.

What to learn from them before commissioning art: whether a full-cell face reads as height at both
ends of the zoom range; whether an 8-cell period is long enough; the paint cost of the
pattern-filled union paths against today's ~900 rects; and how much the pixel-art choice actually
costs `useMapZoom` once zoom has to snap.
