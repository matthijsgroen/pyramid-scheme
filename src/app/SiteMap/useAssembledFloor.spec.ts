// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { assembleFloor } from "@/game/siteAssembler"
import type { FloorGrid, FloorConfig, CorridorCell, RoomCell } from "@/game/siteTypes"
import { useAssembledFloor } from "./useAssembledFloor"
import { cellAddress, cellKey, cellSlot, walkPosition } from "./cellIdentity"
// useAssembledFloor resolves families through the real registry — populate it, same as
// SiteMapScreen.tsx does, so resolution doesn't silently fall back to untagged rooms.
import "@/mods/registerModApps"

/** The save a player standing on this cell would hold: the cell written down under its own key, the
 * way `markCellExplored` writes it as they walk (cellIdentity.ts). */
const exploredAt = (grid: FloorGrid, [row, col]: [number, number]): Record<string, string[]> => {
  const cell = grid.cells[row][col]
  if (cell.type === "empty") throw new Error(`no cell at ${row},${col}`)
  return { [cell.sectionAddress ?? ""]: [cellKey(grid, 0, row, col)!] }
}

const OPPOSITE_DIR: Record<string, string> = { n: "s", s: "n", e: "w", w: "e" }
const DIR_MOVE: Record<string, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }

// The "gateway" is whichever real (non-hidden) cell sits right next to a hidden one — the
// exact spot maskHiddenCells flags as a junction, regardless of whether it's a dedicated
// fork room, a plain corridor corner, or an existing main-path room that a side section
// just happens to attach onto (all of these are possible outcomes of generation, and none
// of them is fixed for a given seed/config, so tests must find it dynamically). To
// reproduce real play, `predecessor` — one step further back, away from the hidden branch —
// is what gets marked "explored": completing it exercises the exact cascade that glides
// through (or stops at, with a detector) the gateway.
const findGatewayToHidden = (
  grid: FloorGrid
): {
  gatewayPos: [number, number]
  predecessorPos: [number, number]
  predecessorCell: CorridorCell | RoomCell
} => {
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (!(cell.type === "room" || cell.type === "corridor") || !cell.hidden) continue
      for (const dir of cell.dirs) {
        const [dr, dc] = DIR_MOVE[dir]
        const gatewayPos: [number, number] = [r + dr, c + dc]
        const gateway = grid.cells[gatewayPos[0]]?.[gatewayPos[1]]
        if (!gateway || (gateway.type !== "room" && gateway.type !== "corridor") || gateway.hidden) continue
        const cameFrom = OPPOSITE_DIR[dir]
        const backDir = [...gateway.dirs].find(d => d !== cameFrom)
        if (!backDir) return { gatewayPos, predecessorPos: gatewayPos, predecessorCell: gateway }
        const [bdr, bdc] = DIR_MOVE[backDir]
        const predecessorPos: [number, number] = [gatewayPos[0] + bdr, gatewayPos[1] + bdc]
        const predecessorCell = grid.cells[predecessorPos[0]]?.[predecessorPos[1]]
        if (!predecessorCell || predecessorCell.type === "empty") continue
        return { gatewayPos, predecessorPos, predecessorCell }
      }
    }
  }
  throw new Error("no gateway leading to a hidden cell found")
}

// Same shape as the HiddenPassage story: a hidden side section reachable only via a fork.
const SEED = 17
const JOURNEY_ID = "hidden-test"
const CONFIG: FloorConfig = {
  pathPuzzles: 2,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [
    { pathPuzzles: 1, difficulty: "expert", end: "treasure" },
    { pathPuzzles: 0, difficulty: "expert", end: "treasure", hidden: true, endReward: { type: "mosaicPiece" } },
  ],
}

describe("useAssembledFloor — hidden junctions", () => {
  it("marks a masked junction reachable for a detector-equipped player, even when it was only auto-glided through as a plain corridor", () => {
    const assembled = assembleFloor(JOURNEY_ID, CONFIG, SEED)
    if (!assembled.success) throw new Error("assembly failed")
    const grid = assembled.grid

    // The gateway sits right next to the hidden branch. Only the endpoint is tagged
    // `hidden`, so on the unmasked graph the gateway has no turn of its own if it's a plain
    // straight corridor — completeCell treats it as an ordinary passthrough and marks it
    // "visible" while auto-revealing past it, rather than stopping there. Completing the
    // predecessor (not the gateway itself) reproduces that real play sequence.
    const { predecessorPos } = findGatewayToHidden(grid)
    const exploredSections = exploredAt(grid, predecessorPos)

    const { result } = renderHook(() =>
      useAssembledFloor(JOURNEY_ID, CONFIG, SEED, 0, exploredSections, null, 1, new Set())
    )

    expect(result.current.hiddenJunctions.size).toBeGreaterThan(0)
    for (const key of result.current.hiddenJunctions) {
      const [r, c] = key.split(",").map(Number)
      const cell = result.current.grid?.cells[r]?.[c]
      if (cell?.type === "empty") throw new Error(`expected a real cell at ${key}`)
      expect(cell?.state).toBe("reachable")
    }

    // Each junction maps to the hidden section it borders — the data the "found = noticed" mark
    // reads (SiteMapScreen calls markCorridorFound on these hashes when the player stands here).
    expect(result.current.junctionSections.size).toBeGreaterThan(0)
    for (const [, hashes] of result.current.junctionSections) {
      expect(hashes.size).toBeGreaterThan(0)
      for (const h of hashes) expect(result.current.hiddenSections.has(h)).toBe(true)
    }
  })

  it("reveals a corridor once its bordering section is in revealedSections, so it becomes walkable", () => {
    // The reveal flow (SiteMapScreen): reaching a junction marks its bordered section found, and
    // that found set is fed back in as revealedSections. A revealed section must un-mask — its cells
    // reappear on the grid and it drops out of the hidden set — otherwise the loot stays unreachable.
    const assembled = assembleFloor(JOURNEY_ID, CONFIG, SEED)
    if (!assembled.success) throw new Error("assembly failed")
    const grid = assembled.grid
    const { predecessorPos } = findGatewayToHidden(grid)
    const exploredSections = exploredAt(grid, predecessorPos)

    // First pass, unrevealed: learn which section the junction borders (what SiteMapScreen reveals).
    const { result: masked } = renderHook(() =>
      useAssembledFloor(JOURNEY_ID, CONFIG, SEED, 0, exploredSections, null, 1, new Set())
    )
    const revealed = new Set(masked.current.hiddenSections)
    expect(revealed.size).toBeGreaterThan(0)

    // Second pass, that section revealed: its cells are no longer masked to empty, and it's gone
    // from hiddenSections — the corridor is now part of the walkable grid.
    const { result } = renderHook(() =>
      useAssembledFloor(JOURNEY_ID, CONFIG, SEED, 0, exploredSections, null, 1, revealed)
    )
    for (const h of revealed) expect(result.current.hiddenSections.has(h)).toBe(false)
    const revealedCellShown = result.current.grid!.cells.some(row =>
      row.some(cell => cell.type !== "empty" && revealed.has(cell.sectionAddress ?? ""))
    )
    expect(revealedCellShown).toBe(true)
  })

  it("leaves the junction alone without a detector, so the player glides through unaware", () => {
    const assembled = assembleFloor(JOURNEY_ID, CONFIG, SEED)
    if (!assembled.success) throw new Error("assembly failed")
    const grid = assembled.grid
    const { predecessorPos } = findGatewayToHidden(grid)
    const exploredSections = exploredAt(grid, predecessorPos)

    const { result } = renderHook(() =>
      useAssembledFloor(JOURNEY_ID, CONFIG, SEED, 0, exploredSections, null, 0, new Set())
    )

    const [r, c] = [...result.current.hiddenJunctions][0].split(",").map(Number)
    const cell = result.current.grid?.cells[r]?.[c]
    if (cell?.type === "empty") throw new Error(`expected a real cell at ${r},${c}`)
    expect(cell?.state).toBe("visible")
  })
})

describe("useAssembledFloor — restoring a saved position", () => {
  // A save holds a cell, and a cell can stop being standable between releases. The one that bites in
  // practice: a section's hash covers its encounter, so re-authoring an encounter turns a hidden
  // section the player had already found back into an unfound one — and if they saved while standing
  // inside it, their cell is masked to void. In bounds, but not on the map, which is where the
  // explorer dot ends up drawn.
  const hiddenCellOf = (grid: FloorGrid): [number, number] => {
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const cell = grid.cells[r][c]
        if ((cell.type === "room" || cell.type === "corridor") && cell.hidden) return [r, c]
      }
    }
    throw new Error("no hidden cell found")
  }

  it("sends the player back to the entrance when the saved cell is no longer somewhere they can stand", () => {
    const assembled = assembleFloor(JOURNEY_ID, CONFIG, SEED)
    if (!assembled.success) throw new Error("assembly failed")
    const [hr, hc] = hiddenCellOf(assembled.grid)

    const { result } = renderHook(() =>
      useAssembledFloor(JOURNEY_ID, CONFIG, SEED, 0, {}, cellAddress(assembled.grid, 0, hr, hc), 0, new Set())
    )

    // Masked to void, so it must not be honoured.
    expect(result.current.grid!.cells[hr][hc].type).toBe("empty")
    expect(result.current.explorerPos).toEqual(result.current.grid!.entrancePos)
  })

  it("honours a saved cell that is still standable", () => {
    const { result } = renderHook(() => useAssembledFloor(JOURNEY_ID, CONFIG, SEED, 0, {}, null, 0, new Set()))
    const grid = result.current.grid!
    const [er, ec] = grid.entrancePos
    // Any real neighbour of the entrance: a position the player could genuinely have saved on.
    const standable = ([...(grid.cells[er][ec] as CorridorCell | RoomCell).dirs] as string[])
      .map(d => DIR_MOVE[d])
      .map(([dr, dc]) => [er + dr, ec + dc] as [number, number])
      .find(([r, c]) => grid.cells[r]?.[c]?.type !== "empty")!

    const { result: restored } = renderHook(() =>
      useAssembledFloor(JOURNEY_ID, CONFIG, SEED, 0, {}, cellAddress(grid, 0, standable[0], standable[1]), 0, new Set())
    )
    expect(restored.current.explorerPos).toEqual(standable)
  })
})

describe("useAssembledFloor — the high-water mark", () => {
  const assembled = assembleFloor(JOURNEY_ID, CONFIG, SEED)
  if (!assembled.success) throw new Error("assembly failed")
  const grid = assembled.grid

  /** Every room of one section, in the order its walk visits them. */
  const chain = (section: string) =>
    grid.cells
      .flatMap((row, r) => row.flatMap((cell, c) => (cell.type === "empty" ? [] : [{ cell, r, c }])))
      .filter(({ cell, r, c }) => (cell.sectionAddress ?? "") === section && cellSlot(grid, r, c))
      .sort((a, b) => walkPosition(a.cell.ordinal!) - walkPosition(b.cell.ordinal!))

  const longestSection = () => {
    const sections = new Set(
      grid.cells.flatMap(row => row.flatMap(cell => (cell.type === "empty" ? [] : [cell.sectionAddress ?? ""])))
    )
    return [...sections].sort((a, b) => chain(b).length - chain(a).length)[0]
  }

  const stateAt = (from: FloorGrid, r: number, c: number) => {
    const cell = from.cells[r][c]
    return cell.type === "empty" ? "empty" : cell.state
  }

  it("brings the corridors back as far as the furthest room the save names, and no further", () => {
    const section = longestSection()
    const rooms = chain(section)
    expect(rooms.length).toBeGreaterThan(1)

    // A save naming ONLY rooms — every corridor key gone, which is what a re-carve leaves behind.
    const upTo = rooms[rooms.length - 2]
    const saved = { [section]: rooms.slice(0, -1).map(({ r, c }) => cellKey(grid, 0, r, c)!) }

    const { result } = renderHook(() => useAssembledFloor(JOURNEY_ID, CONFIG, SEED, 0, saved, null, 0, new Set()))
    const restored = result.current.grid!

    const mark = walkPosition(upTo.cell.ordinal!)
    const corridors = grid.cells.flatMap((row, r) =>
      row.flatMap((cell, c) =>
        cell.type !== "empty" && !cellSlot(grid, r, c) && (cell.sectionAddress ?? "") === section && cell.ordinal
          ? [{ r, c, at: walkPosition(cell.ordinal) }]
          : []
      )
    )
    expect(corridors.some(({ at }) => at < mark)).toBe(true)
    expect(corridors.some(({ at }) => at > mark)).toBe(true)

    for (const { r, c, at } of corridors) {
      if (stateAt(restored, r, c) === "empty") continue
      expect(stateAt(restored, r, c) === "completed").toBe(at <= mark)
    }
  })

  // The one thing the mark must never do. A looted room is remembered by nothing but its own entry, so
  // a chest swept up by the fill would hand the player nothing when they opened it.
  it("never opens a room the save does not name, however far past it the player got", () => {
    const section = longestSection()
    const rooms = chain(section)
    const skipped = rooms[rooms.length - 2]
    const saved = { [section]: rooms.filter(room => room !== skipped).map(({ r, c }) => cellKey(grid, 0, r, c)!) }

    const { result } = renderHook(() => useAssembledFloor(JOURNEY_ID, CONFIG, SEED, 0, saved, null, 0, new Set()))
    const restored = result.current.grid!

    expect(stateAt(restored, skipped.r, skipped.c)).not.toBe("completed")
    // While the room after it, which the save does name, is restored — so the mark really did reach
    // past the skipped one.
    const after = rooms[rooms.length - 1]
    expect(stateAt(restored, after.r, after.c)).toBe("completed")
  })

  it("leaves a section the save no longer matches entirely fogged", () => {
    const { result } = renderHook(() =>
      useAssembledFloor(JOURNEY_ID, CONFIG, SEED, 0, { "gone-section": ["0/p0", "0/p1"] }, null, 0, new Set())
    )
    const restored = result.current.grid!

    const completed = restored.cells.flatMap((row, r) =>
      row.flatMap((cell, c) => (cell.type !== "empty" && cell.state === "completed" ? [[r, c]] : []))
    )
    // Only the entrance, which is explored by standing in it.
    expect(completed).toEqual([[...restored.entrancePos]])
  })
})
