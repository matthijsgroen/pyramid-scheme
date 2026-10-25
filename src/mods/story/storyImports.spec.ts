import { describe, expect, it } from "vitest"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

const filesUnder = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? filesUnder(join(dir, entry.name)) : [join(dir, entry.name)]
  )

describe("the story mod", () => {
  it("imports neither the shop nor the camp: they reach it through core's held keys, gate needs and tags", () => {
    const siblings = ["shop", "camp"]
    const sources = filesUnder("src/mods/story").filter(file => /\.(ts|tsx)$/.test(file) && !/\.spec\./.test(file))
    const imports = sources.flatMap(file =>
      [...readFileSync(file, "utf8").matchAll(/from "@\/mods\/([^/"]+)/g)]
        .filter(([, mod]) => siblings.includes(mod))
        .map(([, mod]) => `${file} -> ${mod}`)
    )
    expect(imports).toEqual([])
  })
})
