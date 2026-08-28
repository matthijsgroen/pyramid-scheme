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

**Player animation direction** — derive facing from the movement vector between frames.
No stored state needed. `ExplorerDot` already has access to `from` and `to` positions.

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

**Painted rather than pixel art**, at **112px square** — 2× the 56-unit cell (`mapScale.ts`),
which covers the zoom range (`useMapZoom`). Transparent background, the subject centred and
drawn to fill the square; it is scaled to the cell with `xMidYMid meet`, so a tall prop stays
tall next to a wide one.

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
