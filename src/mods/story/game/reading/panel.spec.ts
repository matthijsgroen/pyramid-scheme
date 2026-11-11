import { describe, expect, it } from "vitest"
import { glyphSize, inscribed, signCells, type Panel } from "./panel"

const standing: Panel = { aspect: 1, signs: { x: 0.4, y: 0.1, width: 0.2, height: 0.8 }, flow: "column", frame: 0 }
const lying: Panel = { aspect: 2, signs: { x: 0.2, y: 0.25, width: 0.6, height: 0.5 }, flow: "row" }

describe("signs on a painted panel", () => {
  it("leaves the sign the cartouche stands for out of the inside", () => {
    expect(inscribed(standing, ["cartouche", "a", "b", "c"])).toEqual([1, 2, 3])
  })

  it("writes every sign inside when the panel has no frame sign", () => {
    expect(inscribed(lying, ["a", "b"])).toEqual([0, 1])
  })

  it("stacks a standing cartouche's signs top to bottom, filling it", () => {
    const cells = signCells(standing, 4)

    expect(cells.map(cell => Math.round(cell.y * 100) / 100)).toEqual([0.1, 0.3, 0.5, 0.7])
    expect(cells.every(cell => cell.x === 0.4 && cell.width === 0.2 && Math.abs(cell.height - 0.2) < 1e-9)).toBe(true)
  })

  it("lays a lying cartouche's signs left to right", () => {
    expect(signCells(lying, 2)).toEqual([
      { x: 0.2, y: 0.25, width: 0.3, height: 0.5 },
      { x: 0.5, y: 0.25, width: 0.3, height: 0.5 },
    ])
  })

  it("sizes a sign to the tighter side of its cell", () => {
    // Four cells of 0.2 x 0.2 on a square panel: as wide as tall.
    expect(glyphSize(standing, 4)).toBeCloseTo(0.2 * 0.8)
    // Two cells, each 0.3 wide but 0.5 of a panel half as tall as wide: 0.25 of the width.
    expect(glyphSize(lying, 2)).toBeCloseTo(0.25 * 0.8)
  })

  it("shrinks every sign alike as the line grows longer", () => {
    expect(glyphSize(standing, 8)).toBeCloseTo(glyphSize(standing, 4) / 2)
  })

  it("draws nothing for an empty line", () => {
    expect(glyphSize(standing, 0)).toBe(0)
  })
})
