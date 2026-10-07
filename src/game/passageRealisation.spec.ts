import { describe, expect, it } from "vitest"
import { resolvePassageRealisation } from "@/mods/allPassageRealisations"
import { compileLock } from "./lockCompile"
import { parseLock } from "./lockNotation"
import { assembleFloor } from "./siteAssembler"
import type { FloorGrid, RoomCell } from "./siteTypes"
import { carveLockFloor } from "./testSupport/lockFixtures"
import { dirsOf, gateKeysOwned, mechanicsLeft, TOPOLOGY_OFF, TOPOLOGY_ON } from "./testSupport/modOff"
import { CRACK, PASSAGE_BINDING, stoneFloor } from "./testSupport/stoneFixtures"

const SEEDS = Array.from({ length: 60 }, (_, n) => n)
const passages = (grid: FloorGrid): RoomCell[] =>
  grid.cells.flat().flatMap(cell => (cell.type === "room" && cell.passage ? [cell] : []))
const crackFloor = () => stoneFloor(CRACK, { realisations: PASSAGE_BINDING })

describe("a gate empty hands alone open", () => {
  it("is refused when the binding names no passage for it, like any kind the lock uses", () => {
    expect(compileLock(parseLock(CRACK, "stones").lock, { weights: "stonePlate" })).toEqual({
      ok: false,
      faults: [{ type: "unboundRole", kind: "unladen", mechanics: ["in-out"] }],
    })
  })

  it("names the passage it is bound to on its gate", () => {
    const result = compileLock(parseLock(CRACK, "stones").lock, PASSAGE_BINDING)
    if (!result.ok) throw new Error(JSON.stringify(result.faults))
    expect(result.fragment.obstacles).toContainEqual(
      expect.objectContaining({ id: "in-out", kind: "gate", passage: "narrowPassage" })
    )
  })

  it.each([
    ["every owner", "in -[p+unladen]- out"],
    ["any owner", "in -[p|unladen]- out"],
  ])("leaves a door that also waits on a plate (%s) a door", (_, line) => {
    const lock = parseLock(`${line}\np plate @in\nshelf plate @in stone`, "stones").lock
    const result = compileLock(lock, { weights: "stonePlate" })
    if (!result.ok) throw new Error(JSON.stringify(result.faults))
    expect(result.fragment.obstacles.filter(o => o.kind === "gate" && o.passage !== undefined)).toEqual([])
  })
})

describe("the narrow passage on a carved floor", () => {
  it("stands in the gate's own door, which stays a door", () => {
    const grid = carveLockFloor(parseLock(CRACK, "stones").lock, PASSAGE_BINDING, SEEDS)
    const [door, ...more] = passages(grid)
    expect(more).toEqual([])
    expect(door.passage).toEqual({ realisation: "narrowPassage" })
    expect(door.tags).toContain("gate")
    expect(door.requiredKeyId).toMatch(/stones\.in-out$/)
  })

  it("leaves a plain door where no registered mod declares the passage", () => {
    for (const seed of SEEDS) {
      const result = assembleFloor("test", crackFloor(), seed, undefined, { resolvePassage: () => undefined })
      if (!result.success) continue
      expect(passages(result.grid)).toEqual([])
      expect(
        result.grid.cells
          .flat()
          .some(
            cell => cell.type === "room" && cell.tags?.includes("gate") && cell.requiredKeyId?.endsWith("stones.in-out")
          )
      ).toBe(true)
      return
    }
    throw new Error("no seed carved the floor")
  })

  it("carves the walls the mod on carves with the topology mod off, the passage open ground", () => {
    let compared = 0
    for (const seed of SEEDS) {
      const on = assembleFloor("test", crackFloor(), seed, TOPOLOGY_ON.resolveEncounter, {
        resolvePassage: resolvePassageRealisation,
      })
      if (!on.success) continue
      const off = assembleFloor("test", crackFloor(), seed, TOPOLOGY_OFF.resolveEncounter, {
        resolveOneWay: TOPOLOGY_OFF.resolveOneWay,
        resolvePassage: TOPOLOGY_OFF.resolvePassage,
      })
      expect(off.success, `seed ${seed}`).toBe(true)
      if (!off.success) continue
      expect(passages(on.grid)).toHaveLength(1)
      expect(dirsOf(off.grid)).toBe(dirsOf(on.grid))
      expect(mechanicsLeft(off.grid, gateKeysOwned(on.grid))).toEqual([])
      if (++compared >= 5) break
    }
    expect(compared).toBeGreaterThan(0)
  })

  it("gains no passage with the topology mod off, even under the fallback that dresses any named one", () => {
    let compared = 0
    for (const seed of SEEDS) {
      const on = assembleFloor("test", crackFloor(), seed, TOPOLOGY_ON.resolveEncounter, {
        resolvePassage: resolvePassageRealisation,
      })
      if (!on.success) continue
      const off = assembleFloor("test", crackFloor(), seed, TOPOLOGY_OFF.resolveEncounter, {
        resolveOneWay: TOPOLOGY_OFF.resolveOneWay,
      })
      expect(off.success, `seed ${seed}`).toBe(true)
      if (!off.success) continue
      expect(mechanicsLeft(off.grid, gateKeysOwned(on.grid))).toEqual([])
      if (++compared >= 5) break
    }
    expect(compared).toBeGreaterThan(0)
  })

  it("is declared by the topology mod, with its prompt, its art and both hands", () => {
    expect(resolvePassageRealisation("narrowPassage")).toEqual({
      id: "narrowPassage",
      ownerMod: "topology",
      prompt: "ui.prompt.squeeze",
      handsFull: true,
      art: { across: "narrowAcross", along: "narrowAlong" },
    })
  })
})
