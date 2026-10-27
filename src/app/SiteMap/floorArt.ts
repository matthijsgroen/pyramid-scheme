import type { FloorConfig, SubSection, SideSection, Tileset } from "@/game/siteTypes"
import { MECHANISM_STYLE, mechanismFolders } from "./mechanismStyle"
import { tilesetFolderUrls } from "./tileAssets"

/**
 * The tilesets one floor draws in, read off its config the way `cellTileset` reads them off the carved
 * cells: a floor that names a tileset draws every room in it unless a path names its own; a floor that
 * names none draws each room at the tier it was authored at.
 */
export const floorTilesets = (floor: FloorConfig): Tileset[] => {
  const found = new Set<Tileset>([floor.tileset ?? floor.difficulty])
  const tiers = (difficulty: SubSection["difficulty"], byIndex?: SubSection["difficultiesByIndex"]) => {
    if (floor.tileset) return
    found.add(difficulty)
    for (const tier of Object.values(byIndex ?? {})) found.add(tier)
  }
  tiers(floor.difficulty, floor.difficultiesByIndex)
  const visit = (section: SideSection | SubSection) => {
    if (section.tileset) found.add(section.tileset)
    else tiers(section.difficulty, section.difficultiesByIndex)
    for (const sub of "sideSections" in section ? (section.sideSections ?? []) : []) visit(sub)
  }
  floor.sideSections.forEach(visit)
  return [...found]
}

/**
 * Every image the map can draw on this floor: the folders of the tilesets it is drawn in, the mechanism styles
 * those tilesets draw their pieces in, the art every tileset shares (the explorer, the stairs) and the
 * stand-ins for kinds not painted yet. A whole folder
 * rather than the kinds the carve places, because the carve is only known once the floor is assembled —
 * and a folder is a handful of files.
 */
export const floorArtUrls = (
  floor: FloorConfig,
  folderUrls: (folder: string) => string[] = tilesetFolderUrls
): string[] => {
  const tilesets = floorTilesets(floor)
  const styles = tilesets.flatMap(tileset => mechanismFolders(MECHANISM_STYLE[tileset]).filter(f => f !== "default"))
  const folders: string[] = [...tilesets, ...styles, "default", "placeholder"]
  return [...new Set(folders.flatMap(folderUrls))]
}

/** Every image a whole site can draw, the floor the player stands on first. */
export const siteArtUrls = (
  site: readonly FloorConfig[],
  firstFloor = 0,
  folderUrls?: (folder: string) => string[]
): string[] => {
  const first = site[firstFloor]
  const order = first ? [first, ...site.filter(floor => floor !== first)] : site
  return [...new Set(order.flatMap(floor => floorArtUrls(floor, folderUrls)))]
}
