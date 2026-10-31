import { existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import type { Tileset } from "@/game/siteTypes"

// A path, never a `new URL(…, import.meta.url)`: under jsdom (the verify sweeps) `URL` is the browser's, and
// resolves against an http origin.
const tilesRoot = () => join(dirname(fileURLToPath(import.meta.url)), "../assets/tiles")

/** Whether a tileset has painted art for a kind: its own file or the shared `default/` one, never `placeholder/`.
 * The node-side twin of `tileUrl` (app/SiteMap/tileAssets.ts); the folder is read when asked, not at import. */
export const hasTileArt = (tier: Tileset, kind: string, root: string = tilesRoot()): boolean =>
  [tier, "default"].some(folder => existsSync(join(root, folder, `${kind}.png`)))
