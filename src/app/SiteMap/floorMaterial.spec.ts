import { describe, expect, it } from "vitest"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { assembleFloor } from "@/game/siteAssembler"
import { revealAll } from "@/game/gridNavigation"
import { buildRoomClaims, cellFloorAt, tileRegionsFor } from "./roomClaims"
import { ALL_STATES } from "./tileRegions"

// A floor is not all one tier. starter_1's ward-chest teasers are authored at junior on purpose
// (spec/starter.ts), so its first floor is starter stone with a junior pocket gated behind a junior
// key — and walking through that gate has to say so, in the material.
const starterFloorOne = () => {
  const floor = generatedWorldConfigs["starter_1"]?.flat()[0]
  if (!floor) throw new Error("no starter_1 floor to read")
  const result = assembleFloor("starter_1:0", floor, 7)
  if (!result.success) throw new Error("assembly failed")
  return result.grid
}

describe("a floor is built of the tiers its sections were authored at", () => {
  it("carries a tier on every cell it draws, corridors included", () => {
    const grid = starterFloorOne()
    const tiers = new Set<string>()
    let untiered = 0

    for (const row of grid.cells) {
      for (const cell of row) {
        if (cell.type === "empty") continue
        if (cell.difficulty) tiers.add(cell.difficulty)
        else untiered++
      }
    }

    // A corridor used to carry no tier at all, so a passage into a junior pocket had no way to say
    // which stone it was cut through.
    expect(untiered).toBe(0)
    expect([...tiers].sort()).toEqual(["junior", "starter"])
  })

  it("gives the gated pocket its own stone, rooms as well as corridors", () => {
    // Revealed, because regions only cover what the map draws: on a fresh floor the junior pocket is
    // still dark, and dark is not a material.
    const grid = revealAll(starterFloorOne())
    const regions = tileRegionsFor(grid, buildRoomClaims(grid))

    expect([...regions.keys()].sort()).toEqual(["junior", "starter"])

    const junior = regions.get("junior")!
    const rects = (part: Record<string, unknown[]>) => ALL_STATES.flatMap(state => part[state] ?? [])
    // Both, and the rooms are the half that was missing: only encounter rooms carry a difficulty of
    // their own, so a treasure room inside the junior pocket came out built of starter limestone.
    expect(rects(junior.floorCorridor).length).toBeGreaterThan(0)
    expect(rects(junior.floorRoom).length).toBeGreaterThan(0)
  })

  // The pocket's stone is a PROMISE about difficulty, and a gate square paved in it let the player read
  // the promise before earning the right to see it. The gate is on this side of the door, so it wears
  // the pyramid's own stone until it is opened.
  it("paves a gate that is not open yet in the floor's own stone, not the pocket's", () => {
    const grid = revealAll(starterFloorOne())
    const gates = grid.cells
      .flatMap((row, r) => row.map((cell, c) => ({ cell, r, c })))
      .filter(({ cell }) => cell.type === "room" && cell.tags?.includes("gate") && cell.state !== "completed")
    // A junior-authored gate is the case that can leak: one whose own cell carries the pocket's tier.
    const juniorGates = gates.filter(({ cell }) => cell.type === "room" && cell.difficulty === "junior")
    expect(juniorGates.length).toBeGreaterThan(0)

    const claims = buildRoomClaims(grid)
    for (const { r, c } of juniorGates) {
      const at = cellFloorAt(grid, claims, undefined, r, c)
      expect(typeof at === "string" ? at : at.tier).toBe("starter")
    }
  })

  // A GATED SECTION DOES NOT BEGIN AT ITS GATE. World-gen authors the whole branch at the pocket's tier,
  // gate included, and the gate can sit well down it — so the corridor leading TO the gate was built of
  // the pocket's stone and drawn in it. The map then said starter, expert, starter gate, expert: three
  // changes of material to convey one. 693 cells across 59 floors read that way, up to 30 on one floor.
  it("keeps the corridor leading to a ward in the pyramid's own stone", () => {
    const grid = revealAll(starterFloorOne())
    const claims = buildRoomClaims(grid)
    const floorTier = grid.difficulty ?? "starter"
    const gateAt = (r: number, c: number) => {
      const cell = grid.cells[r]?.[c]
      return cell?.type === "room" && (cell.tags?.includes("gate") ?? false)
    }
    // Walk the floor without ever crossing a ward; nothing reached that way may wear another rank.
    const [er, ec] = grid.entrancePos
    const seen = new Set([`${er},${ec}`])
    const queue: Array<[number, number]> = [[er, ec]]
    const step: Record<string, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
    for (let i = 0; i < queue.length; i++) {
      const [r, c] = queue[i]
      if (gateAt(r, c) && !(r === er && c === ec)) continue
      const cell = grid.cells[r]?.[c]
      if (!cell || cell.type === "empty") continue
      for (const dir of cell.dirs) {
        const [dr, dc] = step[dir]
        const key = `${r + dr},${c + dc}`
        if (seen.has(key)) continue
        seen.add(key)
        queue.push([r + dr, c + dc])
      }
    }
    expect(seen.size).toBeGreaterThan(1)
    for (const key of seen) {
      const [r, c] = key.split(",").map(Number)
      if (grid.cells[r]?.[c]?.type === "empty") continue
      const at = cellFloorAt(grid, claims, undefined, r, c)
      const drawn = typeof at === "string" ? at : at.tier
      if (drawn === "stone" || drawn === "unlit") continue
      expect(drawn, `${key} is drawn ${drawn} on the way to a ward`).toBe(floorTier)
    }
  })

  // Where one rank's stone meets another's, the change is a laid sill rather than the line where the
  // art happens to change. It belongs to the tier being ENTERED — the sill is that rank's masonry.
  it("lays a sill where the material changes across a way the player walks", () => {
    const grid = revealAll(starterFloorOne())
    const regions = tileRegionsFor(grid, buildRoomClaims(grid))

    const sills = [...regions.values()].flatMap(groups => groups.threshold)
    expect(sills.length).toBeGreaterThan(0)
    // Only at a boundary: far fewer sills than floor rects, or it is drawing them everywhere.
    const floors = [...regions.values()].flatMap(groups =>
      ALL_STATES.flatMap(state => [...groups.floorRoom[state], ...groups.floorCorridor[state]])
    )
    expect(sills.length).toBeLessThan(floors.length / 10)
  })
})
