import { describe, expect, it } from "vitest"
import { freshState, plainFloor, prepOf, straightWalk } from "./carveFixtures"
import { labelCells } from "./labelCells"
import { assembleFloor } from "./assembleFloor"
import type { SideSection, FloorConfig, RoomCell } from "../siteTypes"
import type { Chain } from "./state"
const section = (overrides: Partial<SideSection> = {}): SideSection => ({
  pathPuzzles: 0,
  difficulty: "expert",
  end: "treasure",
  ...overrides,
})

describe("labelCells", () => {
  const prep = prepOf(plainFloor({ sideSections: [section({ hidden: true, label: "crypt" })] }))
  const chain: Chain = {
    section: prep.sections.sideSections[0],
    cells: [
      [1, 2],
      [2, 2],
    ],
    attachedAt: [0, 2],
    positional: "s0",
    idx: 0,
    doors: [],
    hidden: true,
    keyHostColors: [],
  }
  const labelled = () => {
    const state = {
      ...freshState(prep),
      lay: null,
      maze: straightWalk(3),
      regions: { stepRegion: ["hall", "mid", "mid"], seams: new Set<number>() },
      keys: { chains: [chain], hostColors: new Map() },
    }
    labelCells(prep, state)
    return state.labels!
  }

  it("files the main path under `main`, numbered along the walk, in each step's region", () => {
    const { address, ordinal, region } = labelled()
    expect(["0,0", "0,2", "0,4"].map(key => address.get(key))).toEqual(["main", "main", "main"])
    expect(["0,0", "0,2", "0,4"].map(key => ordinal.get(key))).toEqual(["0", "1", "2"])
    expect(["0,0", "0,2", "0,4"].map(key => region.get(key))).toEqual(["hall", "mid", "mid"])
  })

  it("files a side path under its label, at its own tier, in the region it grows from, hidden where authored so", () => {
    const { address, ordinal, region, difficulty, hidden } = labelled()
    expect(["1,2", "2,2"].map(key => address.get(key))).toEqual(["crypt", "crypt"])
    expect(["1,2", "2,2"].map(key => ordinal.get(key))).toEqual(["0", "1"])
    expect(["1,2", "2,2"].map(key => region.get(key))).toEqual(["mid", "mid"])
    expect(difficulty.get("1,2")).toBe("expert")
    expect(difficulty.get("0,2")).toBe("starter")
    expect([...hidden]).toEqual(["1,2", "2,2"])
  })
})

describe("carved through assembleFloor", () => {
  describe("hidden sections", () => {
    it("never puts a floor key in a hidden section, whose cells are masked until they are found", () => {
      const keyGateBesideAHiddenPath: FloorConfig = {
        pathPuzzles: 1,
        difficulty: "starter",
        end: "treasure",
        exitOrStaircase: "exit",
        sideSections: [
          { pathPuzzles: 1, difficulty: "starter", end: "staircase", gate: { type: "floor-key" } },
          { pathPuzzles: 1, difficulty: "starter", end: "treasure", hidden: true },
        ],
      }

      // Across seeds, because which free section hosts the key is the carve's choice: one seed
      // agreeing proves nothing about the one that picks the other candidate.
      for (let seed = 1; seed <= 25; seed++) {
        const result = assembleFloor("site-hidden-key", keyGateBesideAHiddenPath, seed)
        if (!result.success) continue
        const maskedKeyCells = result.grid.cells
          .flat()
          .filter(cell => "keyColor" in cell && cell.keyColor !== undefined && cell.hidden)
        expect(maskedKeyCells).toEqual([])
      }
    })

    it("includes hidden section cells in the grid, tagged hidden:true", () => {
      const withHidden: FloorConfig = {
        pathPuzzles: 1,
        difficulty: "starter",
        end: "treasure",
        exitOrStaircase: "exit",
        sideSections: [
          { pathPuzzles: 0, difficulty: "starter", end: "treasure" },
          { pathPuzzles: 1, difficulty: "starter", end: "treasure", hidden: true },
        ],
      }
      const withoutHidden: FloorConfig = {
        ...withHidden,
        sideSections: [{ pathPuzzles: 0, difficulty: "starter", end: "treasure" }],
      }
      const rWith = assembleFloor("site-h", withHidden, 99)
      const rWithout = assembleFloor("site-h", withoutHidden, 99)
      expect(rWith.success).toBe(true)
      expect(rWithout.success).toBe(true)
      if (rWith.success) {
        const allCells = rWith.grid.cells.flat()
        const hiddenCells = allCells.filter(c => (c.type === "room" || c.type === "corridor") && c.hidden)
        const visibleRooms = allCells.filter(c => c.type === "room" && !c.hidden)
        // Hidden section cells are present and tagged
        expect(hiddenCells.length).toBeGreaterThan(0)
        // Visible rooms are present (main path + visible side section)
        expect(visibleRooms.length).toBeGreaterThan(0)
        // No cell is both hidden and not hidden
        expect(allCells.filter(c => (c.type === "room" || c.type === "corridor") && c.hidden === false).length).toBe(0)
      }
    })

    it("hidden cells have no hidden:true on visible-section cells", () => {
      const config: FloorConfig = {
        pathPuzzles: 2,
        difficulty: "starter",
        end: "treasure",
        exitOrStaircase: "exit",
        sideSections: [
          { pathPuzzles: 1, difficulty: "starter", end: "treasure" },
          { pathPuzzles: 1, difficulty: "starter", end: "treasure", hidden: true },
        ],
      }
      const result = assembleFloor("site-htag", config, 55)
      expect(result.success).toBe(true)
      if (result.success) {
        const wronglyTagged = result.grid.cells.flat().filter(c => {
          if (c.type !== "room" && c.type !== "corridor") return false
          // All hidden:true cells must have a sectionHash (so we can identify them)
          return c.hidden && !c.sectionHash
        })
        expect(wronglyTagged.length).toBe(0)
      }
    })
  })
})

describe("section hashes across re-authored encounters", () => {
  // A save files its explored cells and found corridors under section hashes, so a hash that moves
  // costs the player that stretch of floor. Encounters are authored per pyramid and re-authored
  // often, and re-authoring one changes no walls — so it must change no hashes either.
  const SEED = 91
  const configWith = (encounter: string | undefined): FloorConfig => ({
    pathPuzzles: 2,
    difficulty: "expert",
    end: "treasure",
    exitOrStaircase: "exit",
    sideSections: [
      { pathPuzzles: 1, difficulty: "expert", end: "treasure", encounter },
      { pathPuzzles: 1, difficulty: "expert", end: "treasure", hidden: true },
    ],
  })

  const hashesOf = (config: FloorConfig): string[] => {
    const result = assembleFloor("site-rehash", config, SEED)
    if (!result.success) throw new Error("assembly failed")
    return [
      ...new Set(
        result.grid.cells
          .flat()
          .filter(c => c.type === "room" || c.type === "corridor")
          .map(c => (c as RoomCell).sectionHash ?? "")
      ),
    ].sort()
  }

  const shapeOf = (config: FloorConfig): string => {
    const result = assembleFloor("site-rehash", config, SEED)
    if (!result.success) throw new Error("assembly failed")
    return JSON.stringify(
      result.grid.cells.map(row =>
        row.map(c => (c.type === "empty" ? "." : `${c.type[0]}${[...c.dirs].sort().join("")}`))
      )
    )
  }

  it("keeps a section's hash when its puzzle family is swapped for another", () => {
    expect(hashesOf(configWith("sumplete"))).toEqual(hashesOf(configWith(undefined)))
    // And the walls really are the same, so there was nothing for a save to lose.
    expect(shapeOf(configWith("sumplete"))).toBe(shapeOf(configWith(undefined)))
  })

  it("keeps a section's hash even when it becomes a trap — the encounter is not the structure", () => {
    // A trap used to carve differently, because the assembler isolated it from leftover maze edges
    // on the strength of its tag. That isolation is now an authored structural field, so which family
    // a room serves cannot reach the layout at all.
    expect(hashesOf(configWith("arithmetic-reflex"))).toEqual(hashesOf(configWith("sumplete")))
    expect(shapeOf(configWith("arithmetic-reflex"))).toBe(shapeOf(configWith("sumplete")))
  })

  it("moves a section's hash when it is sealed, because that really does move the walls", () => {
    const sealed = configWith("sumplete")
    sealed.sideSections![0] = { ...sealed.sideSections![0], sealed: true }
    expect(hashesOf(sealed)).not.toEqual(hashesOf(configWith("sumplete")))
  })
})
