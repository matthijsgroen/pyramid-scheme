import { beforeAll, describe, it, expect } from "vitest"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { topologyMod } from "./index"
import { REGISTERED_MODS, isModEnabled } from "@/mods/registeredMods"
import { ALL_FAMILY_META } from "@/mods/allFamilyMeta"

describe("the topology mod", () => {
  it("is registered", () => {
    expect(isModEnabled("topology")).toBe(true)
    expect(REGISTERED_MODS).toContain(topologyMod)
  })

  it("contributes its families, each owned by itself", () => {
    expect(topologyMod.families?.map(f => f.id)).toEqual(["lightbeam", "lightbeamSwitch", "handle", "torch"])
    expect(topologyMod.families?.map(f => f.ownerMod)).toEqual(["topology", "topology", "topology", "topology"])
  })

  // A switch is a fork the player walks back into to change their mind; without this the branch they
  // did not take is shut for good, and assembleFloor refuses the floor rather than build that.
  it("keeps the lightbeam switch re-enterable, and out of the generic loot pool", () => {
    const meta = topologyMod.families?.find(f => f.id === "lightbeamSwitch")
    expect(meta?.reEnterable).toBe(true)
    expect(meta?.rewardPriority).toBe(0)
  })

  it('places the lightbeam switch only by id, while lightbeam serves the generic "puzzle" pool', () => {
    // Same seam rolePools.spec.ts's poolForTag uses: the pool a role draws from is every registered
    // family whose tags include it (src/mods/allFamilyMeta.ts's familyBag). A room authored to the
    // "puzzle" role must never be able to draw the switch — its answer is which way out opens, so the
    // board would stand somewhere with no fork under it and solving it would decide nothing. Lightbeam
    // is an ordinary corridor puzzle and belongs in that pool, which is why the guard is per family
    // and not per mod.
    const puzzlePool = ALL_FAMILY_META.filter(m => m.tags.includes("puzzle")).map(m => m.id)
    expect(puzzlePool).not.toContain("lightbeamSwitch")
    expect(puzzlePool).toContain("lightbeam")
    expect(ALL_FAMILY_META.map(m => m.id)).toContain("lightbeamSwitch")
  })
})

// The names the retired shrine-door family went by, in an id, a locale namespace and a key id. Each
// of them fails silently if it is left behind: an authored encounter no mod contributes draws
// whatever the fallback is, a gate asks for a key nothing can mint, and a locale namespace nothing
// reads simply ships. So the check is over the source itself rather than over what it loads.
const RETIRED = /witnessdoor|witness door|witness:/i

// The app-side registry a family handed a key through. A mechanic that changes what a floor lets
// through holds floor state instead — a switch's position lives in StoredJourneyStateV3.mechanismStates
// — so nothing mints, nothing registers, and a union over registered sources would be empty on every
// floor: a seam no test could tell working from absent.
const MINTED_KEYS = /ownedkeysource/i

// Everything the shipped app is built out of. Docs are left out on purpose: a design note may still
// tell the story of a mechanic that has been taken out.
const SWEPT_TREES = ["src", "public"]
const SWEPT_FILES = [
  ".betterer.ts",
  "eslint.config.js",
  "index.html",
  "package.json",
  "pwa-assets.config.ts",
  "vite.config.ts",
  "vitest.config.ts",
  "vitest.verify.config.ts",
]
const TEXT = /\.(tsx?|jsx?|json|css|html)$/
// This file has to spell the names to look for them; every other file is the check.
const GUARD = join("src", "mods", "topology", "index.spec.ts")

const filesUnder = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return filesUnder(path)
    return TEXT.test(entry.name) ? [path] : []
  })

describe("the source the app is built from", () => {
  let swept: string[] = []
  let named: string[] = []
  let minting: string[] = []
  // Reading every source and locale file is past the default per-test budget on a loaded machine.
  beforeAll(() => {
    swept = [...SWEPT_TREES.flatMap(filesUnder), ...SWEPT_FILES].filter(path => path !== GUARD)
    const text = new Map(swept.map(path => [path, readFileSync(path, "utf8")]))
    named = swept.filter(path => RETIRED.test(text.get(path)!))
    minting = swept.filter(path => MINTED_KEYS.test(text.get(path)!))
  }, 30_000)

  it("was swept at all (an empty sweep would pass without looking at anything)", () => {
    expect(swept.length).toBeGreaterThan(500)
    expect(swept).toContain(join("src", "worldGen", "spec", "junior.ts"))
    expect(swept).toContain(join("public", "locales", "en", "common.json"))
  })

  it("names no shrine door: not a family, not a locale namespace, not a key id", () => {
    expect(named).toEqual([])
  })

  it("names no registry of minted keys", () => {
    expect(minting, `a minted-key registry is named in:\n${minting.join("\n")}`).toEqual([])
  })
})
