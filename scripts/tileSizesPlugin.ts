import { closeSync, openSync, readSync, readdirSync } from "node:fs"
import { join, relative, sep } from "node:path"
import type { Plugin } from "vite"

const ID = "virtual:tile-sizes"
const RESOLVED = `\0${ID}`

/** A PNG's width and height, read from its IHDR chunk: the 24 bytes after which nothing else is needed. */
export const pngSize = (file: string): [number, number] => {
  const head = Buffer.alloc(24)
  const fd = openSync(file, "r")
  try {
    readSync(fd, head, 0, 24, 0)
  } finally {
    closeSync(fd)
  }
  return [head.readUInt32BE(16), head.readUInt32BE(20)]
}

/** Every PNG under `root` by `<folder>/<name>`, the same key `tileAssets` files its urls under. */
export const tileSizes = (root: string): Record<string, [number, number]> => {
  const sizes: Record<string, [number, number]> = {}
  for (const entry of readdirSync(root, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".png")) continue
    const file = join(entry.parentPath, entry.name)
    sizes[
      relative(root, file)
        .split(sep)
        .join("/")
        .replace(/\.png$/, "")
    ] = pngSize(file)
  }
  return sizes
}

/**
 * `virtual:tile-sizes`: every tile's pixel size, known at build time so a sprite drawn at its own aspect
 * has its box on the first render rather than after its image loads. Read off the files, so dropping a
 * PNG in stays the whole of adding art.
 */
export const tileSizesPlugin = (root: string): Plugin => ({
  name: "tile-sizes",
  resolveId: id => (id === ID ? RESOLVED : undefined),
  load: id => (id === RESOLVED ? `export default ${JSON.stringify(tileSizes(root))}` : undefined),
  configureServer(server) {
    const changed = (file: string) => {
      if (!file.startsWith(root) || !file.endsWith(".png")) return
      const mod = server.moduleGraph.getModuleById(RESOLVED)
      if (mod) server.moduleGraph.invalidateModule(mod)
      server.ws.send({ type: "full-reload" })
    }
    server.watcher.on("add", changed)
    server.watcher.on("change", changed)
    server.watcher.on("unlink", changed)
  },
})
