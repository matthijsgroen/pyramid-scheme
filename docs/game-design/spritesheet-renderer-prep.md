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
