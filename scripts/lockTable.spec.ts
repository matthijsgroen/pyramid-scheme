import { describe, expect, it } from "vitest"
import { parseLock } from "../src/game/lockNotation"
import { formatLockTable, lockRow } from "./lockTable"

const solvable = parseLock(["in -[L]- mid -[T]- out", "L toggle @in", "T torch @mid"].join("\n"), "made")
const cutOff = parseLock(["in -[K]- out", "K activator @out"].join("\n"), "cut")
const sealed = parseLock(["in -[S:a]- side", "side >> in", "in -- out", "S toggle @side"].join("\n"), "sealed")

describe("the catalogue table", () => {
  it("names the mechanisms in a fixed order, the shortest solution, and ✓ for a sound lock", () => {
    const row = lockRow("made", solvable)
    expect(row).toMatchObject({ mechanisms: "lever, torch", checks: "✓", sound: true })
    expect(row.steps).toMatch(/^\d+$/)
  })

  it("shows – for no solution and the first failing check", () => {
    expect(lockRow("lessons/cut", cutOff)).toMatchObject({
      steps: "–",
      checks: "✗ never reached: out",
      sound: false,
    })
  })

  it("names a region a lever seals for good as the failing check, though the lock solves", () => {
    const row = lockRow("sealed", sealed)
    expect(row).toMatchObject({ sound: false })
    expect(row.checks).toMatch(/^✗ a region is lost: from in, S at b, side can never be reached again$/)
    expect(row.steps).toMatch(/^\d+$/)
  })

  it("sorts by path under a header, columns aligned", () => {
    const table = formatLockTable([lockRow("zz", solvable), lockRow("lessons/cut", cutOff)]).split("\n")
    expect(table.map(line => line.split(/\s{2,}/)[0])).toEqual(["lock", "lessons/cut", "zz"])
    expect(new Set(table.map(line => line.indexOf(line.split(/\s{2,}/)[1])))).toHaveProperty("size", 1)
  })
})
