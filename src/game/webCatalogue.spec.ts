import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { websIn } from "./webCatalogue"

describe("the webs the bake reads", () => {
  let root: string | undefined
  afterEach(() => root && rmSync(root, { recursive: true, force: true }))

  it("reads every .web file under the locks root, in its tier folder, and nothing else", () => {
    root = mkdtempSync(join(tmpdir(), "webs-"))
    mkdirSync(join(root, "wizard"))
    writeFileSync(join(root, "wizard", "sands.web"), "// designed by: Tester\n[w3]\nsand by sun\n")
    writeFileSync(join(root, "wizard", "door.lock"), "in -- out\n")
    const webs = websIn(root)
    expect(webs.map(web => [web.name, web.designedBy, web.blocks.length])).toEqual([["sands.web", "Tester", 1]])
  })

  it("reads none where none is written", () => {
    root = mkdtempSync(join(tmpdir(), "webs-"))
    expect(websIn(root)).toEqual([])
  })
})
