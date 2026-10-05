import { describe, expect, it } from "vitest"
import { registerFamily } from "@/app/families/familyRegistry"
import { computeFloorExploration } from "./floorExploration"
import type { FloorGrid, GridCell, RoomCell } from "@/game/siteTypes"
import { floorFrom, roomPiece, type Piece } from "./floorFixtures.testing"

// Which families hold loot is theirs to say and the marker's only to read, so the families here are
// stubs: a chest that draws from the reward pool, and the fill-order-0 kinds that do not.
const CHEST = "explore-chest"
const TABLEAU = "explore-tableau"
const SHOP = "explore-shop"
const TRAP = "explore-trap"
for (const [id, rewardPriority] of [
  [CHEST, 1],
  [TABLEAU, 0],
  [SHOP, 0],
  [TRAP, 0],
] as const)
  registerFamily({
    meta: { id, ownerMod: "test", tags: ["puzzle"], icon: "", color: "", rewardPriority },
    generate: () => null,
    Component: () => null,
  })

const chest = roomPiece({ family: CHEST })
const tableau = (...hieroglyphs: string[]): Piece =>
  roomPiece({ family: TABLEAU, requiredKeyIds: hieroglyphs.map(h => `hieroglyph:${h}`) })
const ward = (key: string): Piece =>
  roomPiece({ family: undefined, tags: ["gate"], gateVariant: "tomb-key", requiredKeyId: key })
const authoredDoor = (key: string): Piece =>
  roomPiece({ family: undefined, tags: ["gate"], gateVariant: "floor-key", requiredKeyId: key, keyIsAuthored: true })

// A tomb floor: two tableaus one behind the other, and a chest behind them both.
const tombFloor = () => floorFrom(["E.AB.C"], { A: tableau("a", "b"), B: tableau("c"), C: chest })

describe("computeFloorExploration", () => {
  // A floor with nothing walked yet is the "everything still to find" baseline the marker records as
  // the player enters — the real recording path applies exploredSections on top.

  it("a pyramid floor: ungated content is open, ward chests become tomb-key bundles", () => {
    // An ungated chest west of the entrance; a ward to the east and another to the south, a chest
    // behind each.
    const grid = floorFrom(["C.E.W.C", "  .", "  J.C"], {
      C: chest,
      W: ward("starter_a_1"),
      J: ward("junior_a_1"),
    })
    const result = computeFloorExploration(grid)
    expect(result.open).toBe(true)
    const flat = result.keySets.map(k => k.join(","))
    expect(flat).toContain("starter_a_1")
    expect(flat).toContain("junior_a_1")
    // Every ward bundle here is a single tomb key — neither ward path needs a combination.
    expect(result.keySets.every(ks => ks.length === 1)).toBe(true)
  })

  it("a tomb floor: each tableau is a hieroglyph key bundle (needs ALL its hieroglyphs)", () => {
    const result = computeFloorExploration(floorFrom(["E.A"], { A: tableau("a", "b") }))
    const hieroglyphBundles = result.keySets.filter(ks => ks.every(k => k.startsWith("hieroglyph:")))
    expect(hieroglyphBundles.length).toBeGreaterThan(0)
    // A tableau needs several hieroglyphs at once — a bundle, not a single key.
    expect(hieroglyphBundles.some(ks => ks.length > 1)).toBe(true)
  })

  // A tester walked a tomb floor to its end, opened every door that opens, and the marker still said
  // there was something to do. There was — a tableau needing hieroglyphs found in a pyramid, and the
  // chest behind it — and neither was anything they could act on from inside the tomb. The floor did
  // not claim to be `open`; it advertised a key bundle that named the chest's own section and not the
  // tableau standing in front of it, so it lit on keys that were never enough.
  const playedOut = (grid: FloorGrid, keep: (cell: GridCell) => boolean = () => false): FloorGrid => ({
    ...grid,
    cells: grid.cells.map(row =>
      row.map(cell => {
        if (cell.type === "empty") return cell
        const asksForKeys = cell.type === "room" && ((cell as RoomCell).requiredKeyIds?.length ?? 0) > 0
        return asksForKeys || keep(cell) ? cell : ({ ...cell, state: "completed" } as GridCell)
      })
    ),
  })

  it("a tomb floor played out to its end stops claiming to be open", () => {
    const grid = playedOut(tombFloor())
    const result = computeFloorExploration(grid)

    // Nothing here is available for the asking any more.
    expect(result.open).toBe(false)
    // What is left is named, so the travel screen lights it the moment those hieroglyphs are held.
    expect(result.keySets.length).toBeGreaterThan(0)
    expect(result.keySets.every(ks => ks.every(k => k.startsWith("hieroglyph:")))).toBe(true)
  })

  it("a chest behind an unsolved tableau inherits the tableau's hieroglyphs", () => {
    // This is the guard for the tester's report — it fails without the inheritance, where the bundle
    // named only the chest's own section.
    const grid = playedOut(tombFloor(), cell => cell.type === "room" && cell.family === CHEST)
    const blockers = grid.cells
      .flat()
      .filter((c): c is RoomCell => c.type === "room" && (c.requiredKeyIds?.length ?? 0) > 0)
    const blockerKeys = new Set(blockers.flatMap(b => b.requiredKeyIds ?? []))
    expect(blockerKeys.size).toBeGreaterThan(0)

    // Every bundle draws only on keys some blocker on this floor asks for — nothing invented.
    for (const ks of computeFloorExploration(grid).keySets)
      for (const key of ks) expect(blockerKeys.has(key)).toBe(true)
    // And at least one bundle is bigger than any single tableau's own set: that is the inheritance.
    const widest = Math.max(...blockers.map(b => (b.requiredKeyIds ?? []).length))
    expect(computeFloorExploration(grid).keySets.some(ks => ks.length > widest)).toBe(true)
  })

  /**
   * A branch whose key is AUTHORED — minted by a room the player solves, never grown in a chest — is
   * content the player can still come back for, so the floor has to keep saying so.
   *
   * It does, through `open` rather than through a bundle: a floor-key gate asks for nothing the player
   * carries between sites, so what is behind it is available for the asking, one more walk away. A
   * bundle instead would name a key the travel screen's held-keys union never carries, and the floor
   * would go dark on the one branch the player still has to be sent back for.
   */
  const walkedUpTo = (grid: FloorGrid, held: ReadonlySet<string>): FloorGrid => {
    const moves: Record<string, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
    const stood = new Set<string>()
    const work: [number, number][] = [[grid.entrancePos[0], grid.entrancePos[1]]]
    while (work.length > 0) {
      const [r, c] = work.pop()!
      const cell = grid.cells[r]?.[c]
      if (!cell || cell.type === "empty" || cell.hidden || stood.has(`${r},${c}`)) continue
      stood.add(`${r},${c}`)
      // The gate square is ground the player stands on; what is past it is not.
      if (cell.type === "room" && cell.requiredKeyId && !held.has(cell.requiredKeyId)) continue
      for (const dir of cell.dirs) {
        const [dr, dc] = moves[dir]
        work.push([r + dr, c + dc])
      }
    }
    return {
      ...grid,
      cells: grid.cells.map((row, r) =>
        row.map((cell, c) =>
          cell.type !== "empty" && stood.has(`${r},${c}`) ? ({ ...cell, state: "completed" } as GridCell) : cell
        )
      ),
    }
  }

  it("a floor whose authored-key branch is still shut keeps inviting the player back", () => {
    // Two shrines either side of the entrance, each with a chest behind it in the shrine's own section.
    const drawn = floorFrom(["C.A.E.B.C"], { C: chest, A: authoredDoor("shrine:west"), B: authoredDoor("shrine:east") })
    const sectionOf = (c: number) => (c <= 2 ? "west" : c >= 6 ? "east" : "main")
    const grid: FloorGrid = {
      ...drawn,
      cells: drawn.cells.map(row =>
        row.map((cell, c) => (cell.type === "empty" ? cell : { ...cell, sectionHash: sectionOf(c) }))
      ),
    }
    const authored = grid.cells
      .flat()
      .filter((c): c is RoomCell => c.type === "room" && !!c.keyIsAuthored && !!c.requiredKeyId)
      .map(c => c.requiredKeyId!)
    expect(authored.length).toBe(2)

    // One shrine opened, its branch walked to the end, everything else on the floor done.
    expect(computeFloorExploration(walkedUpTo(grid, new Set([authored[0]]))).open).toBe(true)
    // Both opened and both walked: nothing left, and the floor stops asking.
    expect(computeFloorExploration(walkedUpTo(grid, new Set(authored))).open).toBe(false)
  })

  // What a node is worth coming back for is what it HOLDS — its family's loot and the keys it asks the
  // player to carry in. The way a switch shut holds neither: it is a door, and the key that opens it is
  // minted a few steps away on this same floor.
  it("a gate a switch shut is nothing to come back for", () => {
    const row: GridCell[] = [
      { type: "room", roomType: "portal", dirs: new Set(["e"]), state: "completed" },
      { type: "corridor", dirs: new Set(["w", "e"]), state: "completed" },
      {
        type: "room",
        roomType: "encounter",
        tags: ["gate"],
        requiredKeyId: "switch:site#0#0#0:main",
        gateVariant: "floor-key",
        keyIsAuthored: true,
        dirs: new Set(["w"]),
        state: "reachable",
      },
    ]
    const grid: FloorGrid = {
      cells: [row],
      rows: 1,
      cols: row.length,
      entrancePos: [0, 0],
      exitPos: [0, 2],
      siteId: "switch-gate",
      staircases: {},
    }

    expect(computeFloorExploration(grid)).toEqual({ open: false, keySets: [] })
  })

  it("shop and gate/trap nodes never produce content on their own (fill-order 0)", () => {
    // The shop family is priority 0; if it (or a gate/trap) leaked in, the floor would claim something
    // to come back for. With every corridor walked, nothing is left but those three.
    const grid = playedOut(
      floorFrom(["E.S.G.T"], {
        S: roomPiece({ family: SHOP }),
        G: authoredDoor("shrine:only"),
        T: roomPiece({ family: TRAP }),
      }),
      cell => cell.type === "room" && cell.roomType === "encounter"
    )
    expect(computeFloorExploration(grid)).toEqual({ open: false, keySets: [] })
  })
})
