import { existsSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import type { Tileset } from "@/game/siteTypes"

const tilesRoot = () => fileURLToPath(new URL("../assets/tiles", import.meta.url))

/** Whether a tileset has painted art for a kind: its own file or the shared `default/` one, never `placeholder/`.
 * The node-side twin of `tileUrl` (app/SiteMap/tileAssets.ts); the folder is read when asked, not at import. */
export const hasTileArt = (tier: Tileset, kind: string, root: string = tilesRoot()): boolean =>
  [tier, "default"].some(folder => existsSync(join(root, folder, `${kind}.png`)))
