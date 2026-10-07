import { describe, expect, it } from "vitest"
import { floorLock } from "./floorLock"
import { oneWayRuns } from "./gridNavigation"
import type { RealisationBinding } from "./lockCompile"
import { parseLock } from "./lockNotation"
import type { ResolveOneWayRealisation } from "./oneWayRealisation"
import { assembleFloor } from "./siteAssembler"
import type { AssemblerReason } from "./siteTypes"
import { carveLockFloor } from "./testSupport/lockFixtures"
import { stoneFloor } from "./testSupport/stoneFixtures"

// A yard with a stone, joined to the way out, and a drop from the way out back to the way in.
const UNLADEN_DROP = "in -- yard\nyard -- out\nout -[unladen]- >> in\nshelf plate @yard stone\nin ?\nyard ?\nout ?"
const STONE_DROP = "in -- yard\nyard -- out\nout >> in\nshelf plate @yard stone\nin ?\nyard ?\nout ?"
const ZIPLINE: RealisationBinding = { weights: "stonePlate", "one-way": "zipline" }
const SEEDS = Array.from({ length: 60 }, (_, n) => n)

const refusalsOf = (text: string, resolveOneWay?: ResolveOneWayRealisation): AssemblerReason[] => {
  const result = assembleFloor(
    "test",
    stoneFloor(text, { realisations: ZIPLINE }),
    1,
    undefined,
    resolveOneWay ? { resolveOneWay } : {}
  )
  return result.success ? [] : result.reasons.filter(reason => reason.type === "oneWayRealisationRefused")
}

describe("a drop that takes empty hands", () => {
  it("carries empty hands onto the drop's cells, and the walk reads them back", () => {
    const grid = carveLockFloor(parseLock(UNLADEN_DROP, "stones").lock, ZIPLINE, SEEDS)
    expect(oneWayRuns(grid).map(run => run.unladen)).toEqual([true])
    expect(floorLock(grid)?.oneWays).toEqual([expect.objectContaining({ unladen: true })])
  })

  it("is bound to the zipline on a stone floor", () => {
    expect(refusalsOf(UNLADEN_DROP)).toEqual([])
  })
})

describe("a zipline a stone could ride", () => {
  it("is refused on a stone floor, naming the drop", () => {
    expect(refusalsOf(STONE_DROP)).toEqual([
      {
        type: "oneWayRealisationRefused",
        from: "stones.out",
        to: "stones.in",
        realisation: "zipline",
        why: "stonePasses",
      },
    ])
  })

  it("binds a realisation that leaves the hands free", () => {
    const loose: ResolveOneWayRealisation = id => ({ id: id ?? "rope", ownerMod: "test", prompt: "rope.invitation" })
    expect(refusalsOf(STONE_DROP, loose)).toEqual([])
  })

  it("is bound as before on a floor with no stones", () => {
    const plain = parseLock("in -- yard\nyard -- out\nout >> in\nin ?\nyard ?\nout ?", "plain").lock
    expect(() => carveLockFloor(plain, { "one-way": "zipline" }, SEEDS)).not.toThrow()
  })
})
