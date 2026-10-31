import { describe, expect, it } from "vitest"
import { readdirSync, readFileSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"

// What the story may import from src/mods: itself, the mod framework (the descriptor type, the registry that says
// which mods are on), and the hieroglyph
// mod its reading plugin builds on. Everything else (the shop, the camp, money, tomb treasure) reaches it through
// core's held keys, gate needs, reactions and tags.
const ALLOWED = ["story", "modDescriptor", "registeredMods", "hieroglyph"]

const filesUnder = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? filesUnder(join(dir, entry.name)) : [join(dir, entry.name)]
  )

// Every module specifier a file names: static, side-effect, re-export and dynamic imports.
const specifiers = (source: string): string[] =>
  [...source.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)].map(match => match[1])

// The entry of src/mods a specifier lands in, by alias or by relative path; undefined outside src/mods.
const modsEntry = (file: string, specifier: string): string | undefined => {
  const target = specifier.startsWith("@/")
    ? resolve("src", specifier.slice(2))
    : specifier.startsWith(".")
      ? resolve(dirname(file), specifier)
      : undefined
  if (!target) return undefined
  const inside = relative(resolve("src/mods"), target)
  return inside.startsWith("..") ? undefined : inside.split("/")[0].replace(/\.(ts|tsx)$/, "")
}

describe("modsEntry", () => {
  it("reads an alias, a relative climb and a plain package", () => {
    expect(modsEntry("src/mods/story/app/a.ts", "@/mods/shop/game/x")).toBe("shop")
    expect(modsEntry("src/mods/story/app/a.ts", "../../camp/game/x")).toBe("camp")
    expect(modsEntry("src/mods/story/app/a.ts", "../game/x")).toBe("story")
    expect(modsEntry("src/mods/story/app/a.ts", "@/app/x")).toBeUndefined()
    expect(modsEntry("src/mods/story/app/a.ts", "react")).toBeUndefined()
  })

  it("sees a dynamic import", () => {
    expect(specifiers('const m = await import("@/mods/shop/x")')).toEqual(["@/mods/shop/x"])
    expect(specifiers('import "@/mods/camp/y"\nexport { a } from "./b"')).toEqual(["@/mods/camp/y", "./b"])
  })
})

describe("the story mod", () => {
  it("imports from src/mods only what it is allowed to", () => {
    const sources = filesUnder("src/mods/story").filter(file => /\.(ts|tsx)$/.test(file) && !/\.spec\./.test(file))
    const outside = sources.flatMap(file =>
      specifiers(readFileSync(file, "utf8")).flatMap(specifier => {
        const entry = modsEntry(file, specifier)
        return entry && !ALLOWED.includes(entry) ? [`${file} -> ${specifier}`] : []
      })
    )
    expect(outside).toEqual([])
  })
})
