import { describe, expect, it } from "vitest"
import { assembleFloor } from "./siteAssembler"
import type { FloorConfig, SideSection } from "./siteTypes"

const side = (overrides: Partial<SideSection> = {}): SideSection => ({
  pathPuzzles: 1,
  difficulty: "starter",
  end: "treasure",
  ...overrides,
})

const floor = (sideSections: SideSection[]): FloorConfig => ({
  pathPuzzles: 2,
  difficulty: "starter",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections,
})

const SEED = 4242

const addressesOf = (config: FloorConfig): Set<string> => {
  const result = assembleFloor("test-journey", config, SEED)
  if (!result.success) throw new Error(`did not assemble: ${JSON.stringify(result.reasons)}`)
  return new Set(
    result.grid.cells.flatMap(row => row.flatMap(cell => (cell.type === "empty" ? [] : [cell.sectionAddress ?? ""])))
  )
}

describe("what a floor calls its sections", () => {
  it("addresses an unlabelled path by where it sits", () => {
    const addresses = addressesOf(floor([side(), side({ sideSections: [side()] })]))

    expect(addresses.has("main")).toBe(true)
    expect(addresses.has("s0")).toBe(true)
    expect(addresses.has("s1")).toBe(true)
    expect(addresses.has("s1.0")).toBe(true)
  })

  it("uses the authored name where a path has one, and the position where it does not", () => {
    const addresses = addressesOf(floor([side({ label: "burial-antechamber" }), side()]))

    expect(addresses.has("burial-antechamber")).toBe(true)
    // The unlabelled sibling keeps its position — labelling is per path, not all-or-nothing.
    expect(addresses.has("s1")).toBe(true)
    expect(addresses.has("s0")).toBe(false)
  })

  /**
   * The whole point of labelling. A positional address follows the index, so inserting a path ahead of
   * another hands the newcomer the old one's name and a player's progress with it. A labelled path is
   * the same path wherever it ends up in the list.
   */
  it("keeps a labelled path's name when another is inserted ahead of it", () => {
    const before = addressesOf(floor([side({ label: "burial-antechamber" }), side()]))
    const after = addressesOf(floor([side(), side({ label: "burial-antechamber" }), side()]))

    expect(after.has("burial-antechamber")).toBe(true)
    // While the unlabelled ones did exactly what they are documented to do, and shifted.
    expect([...before].filter(a => a.startsWith("s"))).toEqual(["s1"])
    expect([...after].filter(a => a.startsWith("s")).sort()).toEqual(["s0", "s2"])
  })

  it("names a labelled sub-path by its label alone, so it can be moved under another parent", () => {
    const addresses = addressesOf(floor([side({ sideSections: [side({ label: "the-shaft" })] })]))

    expect(addresses.has("the-shaft")).toBe(true)
    expect(addresses.has("s0.0")).toBe(false)
  })

  // Two sections a save cannot tell apart would share one player's progress between two places, so
  // this is data loss rather than a layout problem — it fails the floor, and the world build with it.
  it("refuses a floor that uses one name twice", () => {
    const result = assembleFloor("test-journey", floor([side({ label: "twice" }), side({ label: "twice" })]), SEED)

    expect(result.success).toBe(false)
    expect(result.success ? [] : result.reasons).toEqual([{ type: "unusableSectionAddress", address: "twice" }])
  })

  it("refuses a name shaped like a position, which could collide with whoever lands on that index", () => {
    const result = assembleFloor("test-journey", floor([side(), side({ label: "s0" })]), SEED)

    expect(result.success).toBe(false)
    expect(result.success ? [] : result.reasons).toEqual([{ type: "unusableSectionAddress", address: "s0" }])
  })

  it("refuses a name that collides with the main path", () => {
    const result = assembleFloor("test-journey", floor([side({ label: "main" })]), SEED)

    expect(result.success).toBe(false)
    expect(result.success ? [] : result.reasons).toEqual([{ type: "unusableSectionAddress", address: "main" }])
  })
})

describe("what a label may be made of", () => {
  // `#` and `/` separate the parts of a cell address, so a label carrying either would read back as a
  // different section or a different floor — a save quietly pointing at somewhere else.
  it.each([["burial#antechamber"], ["burial/antechamber"], [""], ["  "], ["-leading-dash"]])("refuses %o", label => {
    const result = assembleFloor("test-journey", floor([side({ label })]), SEED)

    expect(result.success).toBe(false)
    expect(result.success ? [] : result.reasons).toEqual([{ type: "unusableSectionAddress", address: label }])
  })

  it("accepts the shapes an author would reach for", () => {
    const addresses = addressesOf(
      floor([side({ label: "burial-antechamber" }), side({ label: "shaft_2" }), side({ label: "Antechamber3" })])
    )

    expect(addresses.has("burial-antechamber")).toBe(true)
    expect(addresses.has("shaft_2")).toBe(true)
    expect(addresses.has("Antechamber3")).toBe(true)
  })
})
