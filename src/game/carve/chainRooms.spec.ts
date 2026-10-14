import { describe, expect, it } from "vitest"
import { chainRooms } from "./chainRooms"
import {
  firstCarved,
  freshState,
  noLabels,
  plainFloor,
  prepOf,
  straightWalk,
  basicConfig,
  isPuzzleRoom,
  isTrapRoom,
  isTreasureRoom,
  isGateRoom,
  findRoom,
} from "./carveFixtures"
import { keyOf } from "./derive"
import { assembleFloor } from "./assembleFloor"
import { validateSite } from "../siteValidator"
import { openDoorsFor } from "../mechanismDoors"
import { cellAddress } from "../cellAddress"
import type { SideSection, FloorConfig, FloorGrid, RoomCell } from "../siteTypes"
import type { Cell, Chain } from "./state"
import type { RegionGraph } from "../regions"
const section = (overrides: Partial<SideSection> = {}): SideSection => ({
  pathPuzzles: 0,
  difficulty: "starter",
  end: "treasure",
  ...overrides,
})

describe("chainRooms", () => {
  it("opens a gated chain on its gate, spreads its puzzles in order and ends on its chest", () => {
    const prep = prepOf(
      plainFloor({ sideSections: [section(), section({ pathPuzzles: 2, gate: { type: "floor-key" } })] })
    )
    const state = firstCarved(prep)
    const gated = state.keys!.chains.find(chain => chain.idx === 1)!
    const rooms = gated.cells.map(cell => state.chainRooms!.get(keyOf(cell)))
    expect(rooms[0]).toMatchObject({ gateVariant: "floor-key", requiredKeyId: gated.keyNodeId })
    expect(rooms.flatMap(room => (room?.pathIndex === undefined ? [] : [room.pathIndex]))).toEqual([0, 1])
    expect(rooms[rooms.length - 1]?.family).toBe("treasure-chest")
  })

  it("retries where a chain has fewer free cells than puzzles", () => {
    const prep = prepOf(plainFloor({ sideSections: [section({ pathPuzzles: 2 })] }))
    const chain: Chain = {
      section: prep.sections.sideSections[0],
      cells: [
        [2, 0],
        [4, 0],
      ] as Cell[],
      attachedAt: [0, 0],
      positional: "s0",
      idx: 0,
      doors: [],
      hidden: false,
      keyHostColors: [],
    }
    const state = {
      ...freshState(prep),
      lay: null,
      maze: straightWalk(3),
      labels: noLabels(),
      keys: { chains: [chain], hostColors: new Map() },
      chainGates: { at: new Map() },
      mainBarrierDoors: new Map(),
    }
    expect(chainRooms(prep, state)).toEqual({ retry: [] })
    expect(state.chainRooms).toBeUndefined()
  })
})

describe("carved through assembleFloor", () => {
  it("resolves a side-section puzzle room's own key requirement via the injected resolver, using that section's own encounterArgs and its own room position", () => {
    const config: FloorConfig = {
      ...basicConfig(),
      sideSections: [
        {
          pathPuzzles: 2,
          difficulty: "starter",
          end: "treasure",
          encounter: "tableau",
          encounterArgs: { runNr: 3 },
        },
      ],
    }
    const result = assembleFloor("starter_treasure_tomb:2", config, 42, undefined, {
      resolveKeyRequirements: (familyId, ctx) =>
        familyId === "tableau" ? [`hieroglyph:${ctx.pathIndex}:${JSON.stringify(ctx.encounterArgs)}`] : undefined,
      floorRef: { journeyId: "starter_treasure_tomb", floorIndex: 2 },
    })
    if (!result.success) throw new Error("assembly failed")
    const puzzleRooms = result.grid.cells
      .flat()
      .filter((c): c is RoomCell => c.type === "room" && c.family === "tableau")
    expect(puzzleRooms).toHaveLength(2)
    const keys = puzzleRooms.map(c => c.requiredKeyIds?.[0]).sort()
    expect(keys).toEqual([
      `hieroglyph:0:${JSON.stringify({ runNr: 3 })}`,
      `hieroglyph:1:${JSON.stringify({ runNr: 3 })}`,
    ])
  })

  it("renders a shop section's stock array at its (chainless) end room", () => {
    // A shop is a pathPuzzles:0 section whose encounter resolves to fez-shop; its end node carries
    // the section's `rewards[]` as buyable stock.
    const config: FloorConfig = {
      pathPuzzles: 2,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [
        {
          pathPuzzles: 0,
          difficulty: "starter",
          end: "treasure",
          encounter: "fez-shop",
          rewards: [{ type: "mosaicPiece" }, undefined],
        },
      ],
    }
    const result = assembleFloor("shop-site", config, 0)
    if (!result.success) throw new Error("assembly failed")
    const shops = result.grid.cells.flat().filter(c => c.type === "room" && c.family === "fez-shop") as RoomCell[]
    expect(shops).toHaveLength(1)
    expect(shops[0].stock).toEqual([{ type: "mosaicPiece" }, undefined])
  })

  it("does not set stock on an ordinary (non-shop) end-of-path room", () => {
    const result = assembleFloor("site-1", basicConfig(), 42)
    if (!result.success) throw new Error("assembly failed")
    const goal = findRoom(result.grid, isTreasureRoom)
    expect(goal?.cell.stock).toBeUndefined()
  })

  it("side-path puzzles are always sumplete, even when the floor's own puzzleFamily is tableau", () => {
    // Tableaus consume hieroglyph symbols the player may not have yet (found via a separate
    // minigame before entering) — side paths (e.g. a shop's) must stay reachable without them.
    const config: FloorConfig = {
      pathPuzzles: 1,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      encounter: "tableau",
      sideSections: [{ pathPuzzles: 1, difficulty: "starter", end: "treasure" }],
    }
    const result = assembleFloor("site-1", config, 1)
    expect(result.success).toBe(true)
    if (result.success) {
      const mainPuzzle = findRoom(result.grid, c => isPuzzleRoom(c) && c.family === "tableau")
      expect(mainPuzzle).not.toBeNull()
      const sidePuzzle = findRoom(result.grid, c => isPuzzleRoom(c) && c.family === "sumplete")
      expect(sidePuzzle).not.toBeNull()
    }
  })

  it("a side section can explicitly opt into a non-default puzzle family", () => {
    // Not hardcoded to sumplete — a section that sets its own puzzleFamily is honored,
    // so a future puzzle family can be placed on a side path without new plumbing.
    const config: FloorConfig = {
      pathPuzzles: 1,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [{ pathPuzzles: 1, difficulty: "starter", end: "treasure", encounter: "tableau" }],
    }
    const result = assembleFloor("site-1", config, 1)
    expect(result.success).toBe(true)
    if (result.success) {
      const sidePuzzle = findRoom(result.grid, c => isPuzzleRoom(c) && c.family === "tableau")
      expect(sidePuzzle).not.toBeNull()
    }
  })

  it("tomb-key gated section produces gate with gateVariant tomb-key and no floor key", () => {
    const config: FloorConfig = {
      pathPuzzles: 1,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [
        { pathPuzzles: 0, difficulty: "starter", end: "treasure", gate: { type: "tomb-key", wardKeyId: "test_ward" } },
      ],
    }
    const result = assembleFloor("site-1", config, 42)
    expect(result.success).toBe(true)
    if (result.success) {
      const gate = findRoom(result.grid, isGateRoom)
      expect(gate).not.toBeNull()
      expect(gate!.cell.gateVariant).toBe("tomb-key")
      // tomb-key gates don't place a key on the floor
      expect(findRoom(result.grid, c => c.reward?.type === "tombKey")).toBeNull()
    }
  })

  it("places every puzzle in a multi-puzzle sub-section at a distinct, valid room", () => {
    // Regression guard: sub-section content used to be indexed as `(contentStart + pi) * 2`
    // instead of `contentStart + pi` — harmless for a single-puzzle sub-section (index 0
    // either way) but wrong for any sub-section with more than one puzzle/chest, which had
    // zero test coverage before this. `packing: 0` keeps the chain at its bare minimum
    // length (no padding slack) so a too-large index reliably goes out of bounds instead of
    // landing on a padding cell that happens to still be in range.
    const config: FloorConfig = {
      pathPuzzles: 1,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      packing: 0,
      sideSections: [
        {
          pathPuzzles: 1,
          difficulty: "starter",
          end: "treasure",
          sideSections: [{ pathPuzzles: 3, difficulty: "junior", end: "treasure" }],
        },
      ],
    }
    const result = assembleFloor("sub-section-indexing-test", config, 42)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(validateSite(result.grid)).toEqual({ valid: true })
    const puzzleRooms = new Set<string>()
    for (let r = 0; r < result.grid.rows; r++)
      for (let c = 0; c < result.grid.cols; c++) {
        const cell = result.grid.cells[r][c]
        if (cell.type === "room" && isPuzzleRoom(cell)) puzzleRooms.add(`${r},${c}`)
      }
    // 1 main-path puzzle + 1 parent-section puzzle + 3 sub-section puzzles, all distinct.
    expect(puzzleRooms.size).toBe(5)
  })

  describe("trap rooms", () => {
    it("places trap rooms for a trapped section", () => {
      const config: FloorConfig = {
        pathPuzzles: 1,
        difficulty: "expert",
        end: "treasure",
        exitOrStaircase: "exit",
        sideSections: [{ pathPuzzles: 2, difficulty: "expert", end: "treasure", encounter: "trap" }],
      }
      const result = assembleFloor("site-trap", config, 42)
      expect(result.success).toBe(true)
      if (result.success) {
        const traps = result.grid.cells.flat().filter(c => c.type === "room" && isTrapRoom(c))
        const puzzles = result.grid.cells.flat().filter(c => c.type === "room" && isPuzzleRoom(c))
        expect(traps.length).toBe(2)
        expect(puzzles.length).toBe(1) // only the main path puzzle
      }
    })

    it("does not place trap rooms for non-trapped sections", () => {
      const config: FloorConfig = {
        pathPuzzles: 1,
        difficulty: "starter",
        end: "treasure",
        exitOrStaircase: "exit",
        sideSections: [{ pathPuzzles: 2, difficulty: "starter", end: "treasure" }],
      }
      const result = assembleFloor("site-notrap", config, 42)
      expect(result.success).toBe(true)
      if (result.success) {
        const traps = result.grid.cells.flat().filter(c => c.type === "room" && isTrapRoom(c))
        expect(traps.length).toBe(0)
      }
    })
  })
})

describe("a control seated in an off-route region", () => {
  // rightLower/s1Chamber is a two-deep chain off `entrance` (doubleBack's own shape), gated by
  // `greenRight` — the same connection Task 2's own describe block above already proves seats a gate.
  // `S1` stands in `s1Chamber`, the DEEP end of the chain, and drives that gate: the control search
  // this task extends has to reach a region no main-path step ever names.
  const chamberLayout = (): RegionGraph => ({
    regions: [
      { name: "entrance", appetite: "free" },
      { name: "out", appetite: "free" },
      { name: "rightLower", appetite: "free" },
      { name: "s1Chamber", appetite: "free" },
    ],
    connections: [
      ["entrance", "out"],
      ["entrance", "rightLower"],
      ["rightLower", "s1Chamber"],
    ],
    in: "entrance",
    out: "out",
  })

  const chamberConfig = (): FloorConfig => ({
    pathPuzzles: 2,
    difficulty: "starter",
    end: "treasure",
    exitOrStaircase: "exit",
    regionLayout: chamberLayout(),
    sideSections: [
      { pathPuzzles: 2, difficulty: "starter", end: "treasure", rewards: [{ type: "c0" }, { type: "c1" }] },
    ],
    obstacles: [{ id: "greenRight", kind: "gate", at: { on: "connection", between: ["rightLower", "s1Chamber"] } }],
    controls: [
      {
        id: "S1",
        in: "s1Chamber",
        states: ["start", "thrown"],
        initial: "start",
        returnsToInitial: false,
        opens: { start: ["greenRight"], thrown: [] },
      },
    ],
  })

  const GATE_KEY = "obstacle:site-chamber#0#0:greenRight"

  it("seats the control in the region it names, not just a main-path one", () => {
    const result = assembleFloor("site-chamber", chamberConfig(), 0)
    if (!result.success) throw new Error(`assembly failed: ${JSON.stringify(result.reasons)}`)

    const controlRoom = result.grid.cells
      .flat()
      .find((c): c is RoomCell => c.type === "room" && c.mechanism !== undefined)
    if (!controlRoom) throw new Error("no control room found")
    expect(controlRoom.region).toBe("s1Chamber")
  })

  // THE PROPERTY THAT MATTERS: a control seated off the main path has to drive its own gate the
  // ordinary way — `openDoorsFor` (mechanismDoors.ts), asked nothing about which region the room
  // stands in. A room that merely exists (the test above) would pass even if it were wired to nothing.
  it("drives its own gate from wherever it stands", () => {
    const result = assembleFloor("site-chamber", chamberConfig(), 0)
    if (!result.success) throw new Error(`assembly failed: ${JSON.stringify(result.reasons)}`)
    const { grid } = result

    const controlRoom = grid.cells.flat().find((c): c is RoomCell => c.type === "room" && c.mechanism !== undefined)
    if (!controlRoom) throw new Error("no control room found")
    let at: string | undefined
    grid.cells.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (cell === controlRoom) at = cellAddress(grid, 0, r, c) ?? undefined
      })
    )
    if (!at) throw new Error("control room has no address")

    // No stored position: the gate stands open, matching S1's own authored initial state.
    expect(openDoorsFor(grid, 0, new Map())).toEqual(new Set([GATE_KEY]))
    // Thrown: S1's own `opens.thrown` names nothing, so the gate shuts.
    expect(openDoorsFor(grid, 0, new Map([[at, "thrown"]]))).toEqual(new Set())
  })

  // ORDINAL STABILITY, THE RULE THIS TASK MUST NOT BREAK: `pathIndex` is the save address
  // (`p${pathIndex}`, cellSlot.ts) and indexes `config.rewards[k]`/`encountersByIndex[k]`, so a puzzle
  // that keeps its node must keep its number whether or not the topology mod that owns `controls` is
  // even registered. Comparing the WHOLE SET of `pathIndex` values (main path and chain alike) against
  // the identical floor with the mod's `obstacles`/`controls` stripped — never a count, which would sit
  // green while every address slid by one — swept across seeds rather than pinned to one, so a
  // seed-dependent renumbering bug cannot hide behind a lucky carve.
  it("carries the identical set of pathIndex values, on the main path and the chain, whether the control is present or not", () => {
    const withoutMod: FloorConfig = {
      pathPuzzles: chamberConfig().pathPuzzles,
      difficulty: chamberConfig().difficulty,
      end: chamberConfig().end,
      exitOrStaircase: chamberConfig().exitOrStaircase,
      sideSections: chamberConfig().sideSections,
    }
    const chainInfo = (grid: FloorGrid, sectionAddress: string) =>
      grid.cells
        .flat()
        .filter(
          (c): c is RoomCell => c.type === "room" && c.sectionAddress === sectionAddress && c.pathIndex !== undefined
        )
        .map(c => ({ pathIndex: c.pathIndex, reward: c.reward }))
        .sort((a, b) => a.pathIndex! - b.pathIndex!)

    let compared = 0
    for (let seed = 0; seed < 60; seed++) {
      const on = assembleFloor("site-chamber-toggle", chamberConfig(), seed)
      const off = assembleFloor("site-chamber-toggle", withoutMod, seed)
      if (!on.success || !off.success) continue
      compared++
      expect(chainInfo(on.grid, "main")).toEqual(chainInfo(off.grid, "main"))
      expect(chainInfo(on.grid, "s0")).toEqual(chainInfo(off.grid, "s0"))
    }
    // A loop that skipped every seed would pass having compared nothing.
    expect(compared).toBeGreaterThan(0)
  })

  // WATCHED FAILING (see below): a control confined to a chain region that never has a free node —
  // `s1Chamber` is the LAST of four regions in a single-region-per-cell chain (`entrance`-`r1`-`r2`-
  // `r3`-`s1Chamber`), so `regionOfStep` never gives it the "extra" cell a shorter list's remainder
  // would (the remainder only ever falls on an EARLIER region — see regions.ts's own `regionOfStep`):
  // whatever length the carve grows the chain to, `s1Chamber`'s own share is always exactly its last
  // cell, the one every chain reserves unconditionally for its end room. No seed ever frees one, so
  // this refuses even after the whole attempt budget, not merely on the first try.
  it("still refuses by name when no chain node is ever free for the control", () => {
    const layout: RegionGraph = {
      regions: [
        { name: "entrance", appetite: "free" },
        { name: "out", appetite: "free" },
        { name: "r1", appetite: "free" },
        { name: "r2", appetite: "free" },
        { name: "r3", appetite: "free" },
        { name: "s1Chamber", appetite: "free" },
      ],
      connections: [
        ["entrance", "out"],
        ["entrance", "r1"],
        ["r1", "r2"],
        ["r2", "r3"],
        ["r3", "s1Chamber"],
      ],
      in: "entrance",
      out: "out",
    }
    const config: FloorConfig = {
      pathPuzzles: 1,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      regionLayout: layout,
      sideSections: [{ pathPuzzles: 0, difficulty: "starter", end: "treasure" }],
      controls: [
        {
          id: "S1",
          in: "s1Chamber",
          states: ["a", "b"],
          initial: "a",
          returnsToInitial: false,
          opens: { a: [], b: [] },
        },
      ],
    }
    const result = assembleFloor("site-chamber-unseatable", config, 42)

    expect(result.success).toBe(false)
    expect(result.success === false && result.reasons).toContainEqual({ type: "controlNotSeated", ids: ["S1"] })
  })

  // TWO OFF-ROUTE CONTROLS SHARING ONE CHAIN — a second control's displacement destination search
  // excluded `chainGateIndices` and `contentIndices` but not `takenByChainControl`, so a control
  // seated on a genuinely free node could be silently overwritten by a puzzle a LATER control's own
  // displacement lands on top of it. `C1`/`C2` seat on this chain's own two free nodes; `C3` finds
  // neither free and is forced to displace — a natural single-region packing only ever leaves its
  // ONE spare node at the FRONT of the content range (`spreadContentIndices`'s own collision
  // resolution always resolves a clash by pushing UP first — regions.ts is silent on this, it is a
  // property of THIS function alone, checked by hand across dozens of (count, length) pairs), which a
  // forward-only displacement search can never reach — so two controls sharing one chain can only
  // ever take the chain's own two separate free nodes, never collide. A third, forced to displace,
  // is what exercises the excluded case: its destination search walks onto `C2`'s own free node.
  it("keeps every off-route control's own room distinct when several share one chain", () => {
    const layout: RegionGraph = {
      regions: [
        { name: "entrance", appetite: "free" },
        { name: "out", appetite: "free" },
        { name: "s1Chamber", appetite: "free" },
      ],
      connections: [
        ["entrance", "out"],
        ["entrance", "s1Chamber"],
      ],
      in: "entrance",
      out: "out",
    }
    const config: FloorConfig = {
      pathPuzzles: 1,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      regionLayout: layout,
      sideSections: [{ pathPuzzles: 2, difficulty: "starter", end: "treasure" }],
      controls: ["C1", "C2", "C3"].map(id => ({
        id,
        in: "s1Chamber",
        states: ["a", "b"],
        initial: "a",
        returnsToInitial: false,
        opens: { a: [], b: [] },
      })),
    }
    const result = assembleFloor("site-chamber-triple", config, 0)
    if (!result.success) throw new Error(`assembly failed: ${JSON.stringify(result.reasons)}`)
    const { grid } = result

    const controlRooms = grid.cells.flat().filter((c): c is RoomCell => c.type === "room" && c.mechanism !== undefined)
    // Every authored control got its own room — the whole set of ids, not a count that would sit
    // green with one silently replaced by a puzzle and another written twice.
    expect(controlRooms.map(c => c.mechanismId).sort()).toEqual(["C1", "C2", "C3"])
    // And each at a DISTINCT cell — three ids naming only two physical rooms is the exact shape of
    // this bug (one control's room silently became another's).
    const positions = new Set<string>()
    grid.cells.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (cell.type === "room" && cell.mechanism !== undefined) positions.add(`${r},${c}`)
      })
    )
    expect(positions.size).toBe(3)
    // The chain's own authored puzzles survive intact alongside them — the whole set of pathIndex
    // values, not a count: a control overwriting a puzzle's cell would drop that ordinal from here.
    const puzzleIndices = grid.cells
      .flat()
      .filter((c): c is RoomCell => c.type === "room" && c.sectionAddress === "s0" && c.pathIndex !== undefined)
      .map(c => c.pathIndex)
      .sort()
    expect(puzzleIndices).toEqual([0, 1])
  })
})
