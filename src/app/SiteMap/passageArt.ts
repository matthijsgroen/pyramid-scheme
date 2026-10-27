import type { ResolvePassageRealisation } from "@/game/passageRealisation"
import type { RoomCell, Tileset } from "@/game/siteTypes"
import { resolvePassageRealisation } from "@/mods/allPassageRealisations"
import { mechanismTileUrl } from "./tileAssets"

/** The tile a passage is drawn with: its realisation's wall across a way running north-south, and along one
 * running east-west. A passage at a corner shows its face, as one across does. Undefined where the realisation
 * declares no art, or no registered mod declares it. */
export const passageTile = (
  cell: RoomCell,
  resolve: ResolvePassageRealisation = resolvePassageRealisation
): string | undefined => {
  const art = cell.passage && resolve(cell.passage.realisation)?.art
  if (!art) return undefined
  return cell.dirs.has("n") || cell.dirs.has("s") ? art.across : art.along
}

/** The passage's painting in the mechanism style of the tileset the cell is drawn in. */
export const passageArtUrl = (cell: RoomCell, tileset: Tileset): string | undefined => {
  const name = passageTile(cell)
  return name === undefined ? undefined : mechanismTileUrl(tileset, name)
}
