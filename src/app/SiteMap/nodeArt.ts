import type { Direction } from "@/game/siteTypes"
import { CELL } from "./mapScale"

/** How far a node's own furniture stands out of the way of its marker, across and up the cell.
 *
 * The marker is centred on the cell and so is the explorer, so furniture drawn square on the cell is
 * furniture the player is standing inside. Across is the bigger step: a sprite is a cell wide and only
 * the middle of it is the object, so it takes more sideways than backwards to clear the figure. */
export const NODE_ART_DX = CELL * 0.3
export const NODE_ART_DY = CELL * 0.2

/** The marker over its own furniture. It still has to read as a node — the state colour and the key
 * badges are on it — so this eases it back rather than hiding it; the art says what the room holds and
 * the marker says whether you can get to it. */
export const NODE_OVER_ART_OPACITY = 0.72

/** Which corner of its cell a node's furniture stands in: AWAY from every way out.
 *
 * The player enters by one of the cell's own `dirs` and leaves by another, so the free quarter is the
 * one no exit points at — the far end of a dead end, the side of a through room, the corner away from
 * both arms of a bend. Summing the exits and walking the other way gives all of those from one rule.
 *
 * A cell whose exits cancel — a straight passage, a crossroads — has no free quarter, and there the
 * answer is simply "off the path": it steps aside and stays level, which on a north-south passage is
 * the wall and on a crossroads is the only room left. */
export const nodeArtOffset = (dirs: ReadonlySet<Direction> | undefined): { dx: number; dy: number } => {
  let x = 0
  let y = 0
  for (const dir of dirs ?? []) {
    if (dir === "e") x += 1
    if (dir === "w") x -= 1
    // North is UP the page, so it is negative y — the same axis the sprite is anchored on.
    if (dir === "n") y -= 1
    if (dir === "s") y += 1
  }
  // Stepped rather than scaled, and written out so an axis with no exits on it lands on a plain 0
  // rather than on the -0 that `-Math.sign(0) * size` gives.
  const step = (sum: number, size: number) => (sum === 0 ? 0 : -Math.sign(sum) * size)
  // WITH NO SOUTH DOOR, THE FURNITURE COMES SOUTH. A room entered only from the sides has its whole
  // near edge free, and near the viewer is the good half of the cell: the player then walks BEHIND the
  // chest rather than beside it, which is the whole of why the depth sort exists. Nothing is blocked,
  // because no way out runs through it.
  const nearSideFree = !(dirs?.has("s") ?? false)
  if (y === 0 && nearSideFree) return { dx: x === 0 ? NODE_ART_DX : step(x, NODE_ART_DX), dy: NODE_ART_DY }
  if (x === 0 && y === 0) return { dx: NODE_ART_DX, dy: 0 }
  return { dx: step(x, NODE_ART_DX), dy: step(y, NODE_ART_DY) }
}

/** The clip that keeps furniture inside the room it stands in: the floor, grown upward by a prop's
 * headroom. Side walls and the wall below cut the sprite; the band above does not, because rising into
 * it is how a tall thing occludes the wall behind it. Defined in `SiteMapView`'s `<defs>`. */
export const STANDING_ROOM_CLIP = "standing-room"

/** One sprite of a node's own furniture, in MAP space.
 *
 * Map space and not the cell's, which is the whole reason this is a list rather than a child of each
 * node's `<g transform>`: `clip-path` resolves in the element's own transformed space, so a clip built
 * from the floor's rectangles lands offset by the cell's position and cuts the sprite away. In jsdom
 * nothing rasterises, so the `<image>` exists and a test sees it; in a browser the chests vanished from
 * every floor in the game. Drawn as one clipped layer in map space, the clip means what it says.
 */
export type NodeSprite = {
  key: string
  url: string
  x: number
  y: number
  /** Mirrored in x — how a stair is aimed. A reflection is a real oblique view; a rotation is a skew. */
  mirrored: boolean
  /** Where this sprite's own flame lands on the floor, in map space, if it carries one.
   *
   * AT THE FLAME AND NOT AT THE CELL. A stair's cresset stands at the edge of its mouth, some 24 units
   * off centre, so a pool laid at the middle of the cell fell under the shaft — the one part of the tile
   * that is drawn near-black over it — and the torch lit nothing anyone could see. */
  light?: { x: number; y: number; r: number }
  /** The cells this sprite may be drawn on: its room's own footprint, as "r,c" keys.
   *
   * ITS OWN ROOM AND NOT THE WHOLE FLOOR. Furniture stands off-centre, and a sprite is a cell wide, so
   * it reaches past its cell — clipped to every floor rect on the map it simply passed THROUGH a wall
   * and appeared in the corridor on the other side. A room's own footprint is the only shape that both
   * lets a chest overlap the paving beside it and stops it at the masonry. */
  footprint: readonly string[]
  /** Cells whose occupant this sprite should go see-through for, as "r,c" keys.
   *
   * THE ARCHWAY'S RULE, for the same reason. A gate is drawn across the mouth of a way through, so the
   * player walks BEHIND it — and a barrier that hid him would be a wall. `ARCH_FADE` is what a doorway
   * already does when he stands in it, and a gate is a doorway with bars in it. */
  fadeAt?: readonly string[]
}
