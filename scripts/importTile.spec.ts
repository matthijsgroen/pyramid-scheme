import { execFileSync } from "node:child_process"
import { createRequire } from "node:module"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import sharp from "sharp"
import { afterAll, describe, expect, it } from "vitest"

/**
 * The import is a pipeline of image operations, and the one that can silently ruin a file is `--flatten`:
 * it lays a wash of the rank's own stone over the art, and a wash is a rectangle. Laid plainly it fills the
 * hole through an archway with solid masonry — the doorway stops being a doorway, every flatten strength
 * measures the same, and nothing in the numbers says why. `blend: "atop"` is what keeps it on the art.
 *
 * So: one archway through the real script, and the middle has to still be see-through.
 */
const root = join(import.meta.dirname, "..")
const tmp = mkdtempSync(join(tmpdir(), "import-tile-"))

afterAll(() => rmSync(tmp, { recursive: true, force: true }))

/** A crude archway: magenta opening down the middle, stone either side, from the top edge to the bottom. */
const archwayFixture = async (file: string) => {
  const width = 300
  const height = 200
  const pixels = Buffer.alloc(width * height * 3)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3
      const isOpening = x > 100 && x < 200 && y > 40
      pixels[i] = isOpening ? 255 : 0x6c
      pixels[i + 1] = isOpening ? 0 : 0x62
      pixels[i + 2] = isOpening ? 255 : 0x57
    }
  }
  await sharp(pixels, { raw: { width, height, channels: 3 } })
    .png()
    .toFile(file)
}

// tsx's own CLI rather than `yarn tsx`: this runs alongside the whole suite, and a package-manager
// start-up per call is most of the wall clock. Resolved rather than hard-coded — yarn's node_modules has
// no .bin, the real file lives under .store.
const tsxCli = createRequire(import.meta.url).resolve("tsx/cli")
const importTile = (args: string[]) =>
  execFileSync(process.execPath, [tsxCli, "scripts/importTile.ts", ...args], { cwd: root, encoding: "utf8" })

describe("import-tile", () => {
  it("leaves an archway's opening transparent, flattened or not", { timeout: 60_000 }, async () => {
    const source = join(tmp, "arch.png")
    await archwayFixture(source)

    for (const flatten of ["0", "0.8"]) {
      importTile([source, "--tier=starter", `--name=spec-arch-${flatten}`, "--slot=arch", `--flatten=${flatten}`])
      const out = join(root, "src/assets/tiles/starter", `spec-arch-${flatten}.png`)
      const { data, info } = await sharp(out).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
      // The middle of the slot is the way through: it must be a hole whatever the wash did.
      const middle = (Math.round(info.height * 0.75) * info.width + Math.round(info.width / 2)) * info.channels
      expect(data[middle + 3], `flatten=${flatten} filled the opening`).toBe(0)
      rmSync(out)
    }
  })
})
