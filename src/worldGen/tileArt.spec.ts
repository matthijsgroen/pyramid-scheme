import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { hasTileArt } from "./tileArt"

const rootWith = (files: string[]) => {
  const root = mkdtempSync(join(tmpdir(), "tiles-"))
  for (const f of files) {
    mkdirSync(join(root, f.split("/")[0]), { recursive: true })
    writeFileSync(join(root, f), "")
  }
  return root
}

describe("hasTileArt", () => {
  it("finds a kind painted in the tier", () => {
    expect(hasTileArt("junior", "jar", rootWith(["junior/jar.png"]))).toBe(true)
  })
  it("finds a kind painted in default", () => {
    expect(hasTileArt("junior", "jar", rootWith(["default/jar.png"]))).toBe(true)
  })
  it("does not count another tier's art", () => {
    expect(hasTileArt("junior", "jar", rootWith(["expert/jar.png"]))).toBe(false)
  })
  it("does not count a placeholder", () => {
    expect(hasTileArt("junior", "jar", rootWith(["placeholder/jar.png"]))).toBe(false)
  })
})
