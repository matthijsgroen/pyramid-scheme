import { describe, expect, it } from "vitest"
import { blockedCells, fillsOf, MAX_FILLS, placeBlobs, prefabFaults, variantsOf } from "./prefabChecks"
import { parsePrefab } from "./prefabNotation"
import { SINGLE_CELL } from "./siteTypes"
import type { DecorationKind, PropFootprint } from "./siteTypes"

// Made-up sizes: bones lie on the ground two cells across.
const footprintOf = (kind: DecorationKind): PropFootprint =>
  kind === "bones" ? { cols: 2, rows: 1, tall: 0, ground: true } : SINGLE_CELL
const room = (header: string, grid: string[], legend: string[]) =>
  parsePrefab(`tier junior\n${header}\nlayout\n${grid.join("\n")}\n${legend.join("\n")}`, "test", footprintOf)

describe("prefab variants and checks", () => {
  it("a declared place or special that is never drawn still reads, and the checks name it", () => {
    const prefab = room("", ["# # d # #", "# s . . #", "# # # # #"], ["s stop", "w wall shelf", "a actor"])
    expect(prefabFaults(prefab)).toEqual(['"w" is declared but never drawn', '"a" is declared but never drawn'])
  })

  it("mirrors doors, places and the stop", () => {
    const prefab = room(
      "mirror",
      ["# # d # # #", "# s . w . #", "d . . . . #", "# # # # # #"],
      ["s stop", "w wall shelf"]
    )
    const [plain, mirrored] = variantsOf(prefab)
    expect(mirrored.mirrored).toBe(true)
    const columns = (cells: readonly string[], letter: string) =>
      cells.flatMap(row => [...row].flatMap((ch, x) => (ch === letter ? [x] : [])))
    const width = plain.cells[0].length
    for (const letter of ["d", "s"])
      expect(columns(mirrored.cells, letter).sort()).toEqual(
        columns(plain.cells, letter)
          .map(x => width - 1 - x)
          .sort()
      )
    expect(placeBlobs(plain, prefab)[0]).toMatchObject({ top: 1, left: 3 })
    expect(placeBlobs(mirrored, prefab)[0]).toMatchObject({ top: 1, left: width - 1 - 3 })
  })

  it("a 3 of 4 group yields 4 fills, all with 3 filled", () => {
    const prefab = room(
      "",
      ["# # # # # # # # #", "# g . g . g . g #", "# s . . . . . . #", "# # # d # # # # #"],
      ["s stop", "g floor? jarRack 3 of 4"]
    )
    const fills = fillsOf(variantsOf(prefab)[0], prefab)
    expect(fills).toHaveLength(4)
    for (const fill of fills) expect(fill.size).toBe(3)
  })

  it("a per group fills one top per stump; a top touching two stumps counts for both", () => {
    const prefab = room(
      "",
      ["# # # d # # #", "# r q r q r #", "# s . . . . #", "# # # # # # #"],
      ["s stop", "q floor pillar", "r floor rubblePile 1 of 3 per q"]
    )
    const variant = variantsOf(prefab)[0]
    const blobs = placeBlobs(variant, prefab)
    const fills = fillsOf(variant, prefab).map(fill =>
      blobs.filter(b => b.letter === "r" && fill.has(`${b.top},${b.left}`))
    )
    expect(fills).toHaveLength(2)
    for (const tops of fills)
      for (const stump of blobs.filter(b => b.letter === "q"))
        expect(tops.filter(top => Math.abs(top.left - stump.left) === 1)).toHaveLength(1)
  })

  it("filled floor places block, ground places do not", () => {
    const prefab = room(
      "",
      ["# # # # # #", "d p m m s d", "# # # # # #"],
      ["s stop", "p floor pillar", "m ground bones"]
    )
    const variant = variantsOf(prefab)[0]
    const fill = fillsOf(variant, prefab)[0]
    const blocked = blockedCells(variant, prefab, fill)
    expect(blocked.has("1,1")).toBe(true)
    expect(blocked.has("1,2")).toBe(false)
  })

  it("ground places never block", () => {
    const prefab = room("", ["# # # # # #", "d . m m s d", "# # # # # #"], ["s stop", "m ground bones"])
    expect(prefabFaults(prefab)).toEqual([])
  })

  it("refuses a room whose pillar cuts two doors apart in one fill", () => {
    const prefab = room("", ["# # # # # #", "d . p s . d", "# # # # # #"], ["s stop", "p floor? pillar"])
    const faults = prefabFaults(prefab)
    expect(faults.some(fault => fault.includes("door 1,0 and door 1,5"))).toBe(true)
    for (const fault of faults) expect(fault).toContain("layout #0, filled p@1,2")
  })

  it("refuses a stop walled in by a filled optional place", () => {
    const prefab = room("", ["# # # # #", "# s g . #", "# # # d #"], ["s stop", "g floor? pillar"])
    const faults = prefabFaults(prefab)
    expect(faults).toHaveLength(1)
    expect(faults[0]).toContain("the stop at 1,1")
  })

  it("refuses a chest whose every neighbour is filled", () => {
    const prefab = room("", ["# # # # #", "# c g s #", "# # # d #"], ["c chest", "s stop", "g floor pillar"])
    const faults = prefabFaults(prefab)
    expect(faults).toHaveLength(1)
    expect(faults[0]).toContain(`chest "c"`)
  })

  it("refuses a group that cannot fill what it takes", () => {
    const prefab = room("", ["# # # # #", "# g . g #", "# s . . #", "# # d # #"], ["s stop", "g floor? pillar 3 of 3"])
    expect(prefabFaults(prefab)).toEqual(["layout #0: g cannot fill 3 of 2"])
  })

  it("refuses a per owner with too few blobs touching it", () => {
    const prefab = room(
      "",
      ["# # # d # # #", "# q . . r . #", "# s . . . . #", "# # # # # # #"],
      ["s stop", "q floor pillar", "r floor rubblePile 1 of 1 per q"]
    )
    expect(prefabFaults(prefab)).toEqual(["layout #0: r cannot fill 1 of 0 per q@1,1"])
  })

  it("names a mirrored variant in a fault", () => {
    const prefab = room("mirror", ["# # # # # #", "d . p s . d", "# # # # # #"], ["s stop", "p floor? pillar"])
    expect(prefabFaults(prefab).some(fault => fault.startsWith("layout #0 mirrored, filled p@1,"))).toBe(true)
  })

  it("refuses 30 optional blobs by their count, building no fill", () => {
    const blobs = 30
    const row = (fill: (x: number) => string) =>
      ["#", ...Array.from({ length: blobs * 2 - 1 }, (_, x) => fill(x)), "#"].join(" ")
    const prefab = room(
      "",
      [
        row(() => "#").replace("# #", "# d"),
        row(x => (x % 2 === 0 ? "g" : ".")),
        row(x => (x === 0 ? "s" : ".")),
        row(() => "#"),
      ],
      ["s stop", "g floor? pillar"]
    )
    expect(prefabFaults(prefab)).toEqual(["layout #0: too many fills to check"])
    expect(fillsOf(variantsOf(prefab)[0], prefab)).toEqual([])
  })

  it("refuses past MAX_FILLS", () => {
    const blobs = 13
    const row = (fill: (x: number) => string) =>
      ["#", ...Array.from({ length: blobs * 2 - 1 }, (_, x) => fill(x)), "#"].join(" ")
    const prefab = room(
      "",
      [
        row(() => "#").replace("# #", "# d"),
        row(x => (x % 2 === 0 ? "g" : ".")),
        row(x => (x === 0 ? "s" : ".")),
        row(() => "#"),
      ],
      ["s stop", "g floor? pillar"]
    )
    expect(2 ** blobs).toBeGreaterThan(MAX_FILLS)
    expect(prefabFaults(prefab)).toEqual([expect.stringContaining("too many fills to check")])
  })
})
