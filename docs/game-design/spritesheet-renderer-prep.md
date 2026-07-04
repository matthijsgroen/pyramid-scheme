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

### 2. Unify the cell-size constant

`SiteMapView` has `const CELL = 44` (internal, not exported).  
`ExplorerDot` exports `SITE_MAP_CELL = 44` separately — already out of sync in name.

- Add a `cellSize` prop to `SiteMapView` (default 44)
- Pass it down to `ExplorerDot` rather than each hardcoding their own value

Sprite tiles are typically 16, 32, or 64 px — this makes changing the size a one-liner.

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
