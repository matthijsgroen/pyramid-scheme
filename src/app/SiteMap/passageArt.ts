import type { ResolvePassageRealisation } from "@/game/passageRealisation"
import type { RoomCell } from "@/game/siteTypes"
import { resolvePassageRealisation } from "@/mods/allPassageRealisations"
import { sharedTileUrl } from "./tileAssets"

/** The shared tile a passage is drawn with: its realisation's wall across a way running north-south, and along one
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

/** The passage's painting, shared by every rank. */
export const passageArtUrl = (cell: RoomCell): string | undefined => {
  const name = passageTile(cell)
  return name === undefined ? undefined : sharedTileUrl(name)
}
