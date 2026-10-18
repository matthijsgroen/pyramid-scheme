// THE TIER WEBS IN ./locks: each `.web` file the designer wrote, read like the locks beside it (lockCatalogue.ts), from
// disk, so the bake, the CLI and tests only. A world with none places no web.
import { readFileSync, readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { parseWeb } from "./webNotation"
import type { Web } from "./webNotation"

const here = dirname(fileURLToPath(import.meta.url))

/** The path of every `.web` file under a folder, at any depth, sorted. */
export const webFilesIn = (folder: string): string[] =>
  readdirSync(folder, { withFileTypes: true })
    .flatMap(entry =>
      entry.isDirectory()
        ? webFilesIn(join(folder, entry.name))
        : entry.name.endsWith(".web")
          ? [join(folder, entry.name)]
          : []
    )
    .sort()

/** Every web under a locks root, each read under its file name. */
export const websIn = (root: string): Web[] =>
  webFilesIn(root).map(path => parseWeb(readFileSync(path, "utf8"), path.slice(path.lastIndexOf("/") + 1)))

/** The webs the world is baked with. */
export const worldWebs = (): Web[] => websIn(join(here, "locks"))
