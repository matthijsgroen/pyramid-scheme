import { describe, expect, it } from "vitest"
import { compileLock } from "./lockCompile"
import { parseLock } from "./lockNotation"
import { resolvePassageRealisation } from "@/mods/allPassageRealisations"
import { assembleFloor } from "./siteAssembler"
import type { FloorGrid, RoomCell } from "./siteTypes"
import { dirsOf, gateKeysOwned, mechanicsLeft, TOPOLOGY_OFF, TOPOLOGY_ON } from "./testSupport/modOff"
import { PASSAGE_BINDING, PIPE_BINDING, PIPED, stoneFloor } from "./testSupport/stoneFixtures"

const SEEDS = Array.from({ length: 40 }, (_, n) => n)
const holes = (grid: FloorGrid): RoomCell[] =>
  grid.cells.flat().flatMap(cell => (cell.type === "room" && cell.pipeHole ? [cell] : []))

describe("a lock's stone pipe, bound to its realisation", () => {
  it("compiles bound pipe: stonePipe, and is refused by name unbound", () => {
    expect(compileLock(parseLock(PIPED, "stones").lock, PIPE_BINDING).ok).toBe(true)
    expect(compileLock(parseLock(PIPED, "stones").lock, PASSAGE_BINDING)).toEqual({
      ok: false,
      faults: [{ type: "unboundRole", kind: "pipe", mechanics: ["P"] }],
    })
  })

  it("carves the walls the mod on carves with the topology mod off, its holes bare nodes", () => {
    let compared = 0
    for (const seed of SEEDS) {
      const floor = stoneFloor(PIPED, { realisations: PIPE_BINDING })
      const on = assembleFloor("test", floor, seed, TOPOLOGY_ON.resolveEncounter, {
        resolvePassage: resolvePassageRealisation,
      })
      if (!on.success) continue
      const off = assembleFloor("test", floor, seed, TOPOLOGY_OFF.resolveEncounter, {
        resolveOneWay: TOPOLOGY_OFF.resolveOneWay,
        resolvePassage: TOPOLOGY_OFF.resolvePassage,
      })
      expect(off.success, `seed ${seed}`).toBe(true)
      if (!off.success) continue
      expect(holes(on.grid)).toHaveLength(2)
      expect(holes(off.grid)).toEqual([])
      expect(dirsOf(off.grid)).toBe(dirsOf(on.grid))
      expect(mechanicsLeft(off.grid, gateKeysOwned(on.grid))).toEqual([])
      if (++compared >= 5) break
    }
    expect(compared).toBeGreaterThan(0)
  })
})
