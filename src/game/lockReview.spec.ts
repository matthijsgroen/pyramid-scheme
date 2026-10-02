import { describe, expect, it } from "vitest"
import { walkSpecOf } from "./lockWalkSpec"
import { parseLock } from "./lockNotation"
import { lockQuality, solveLock, unreachedRegions } from "./lockReview"

const spec = (text: string) => walkSpecOf(parseLock(text).lock)
const LAMPLIGHTER = `
  in -[Y]- west
  in -[Y]- east -[A+B]- out
  west >> east >> in
  Y fork @in
  A toggle @west
  B toggle @east
`

describe("solveLock", () => {
  it("reads the cheapest way through without walk-only stretches", () => {
    expect(solveLock(spec("in -[H]- >> hall\nhall -- out\nH toggle @in"))?.steps).toEqual(["in", "H:b", "⤓hall", "out"])
  })
})

describe("lockQuality", () => {
  it("calls a drop that only saves actions a shortcut", () => {
    expect(lockQuality(parseLock(LAMPLIGHTER).lock)).toEqual(["drop west>east is an optional shortcut"])
  })

  it("sends a one-choice board back to being a fork", () => {
    const { lock } = parseLock("in -[Y]- vault\nin -[Y]- out\nY fork @in\nvault $")
    expect(lockQuality(lock)).toContain("under two actions solve it: a single choice is a switch fork, not a lock")
  })

  it("finds the gate a drop makes idle", () => {
    const { lock } = parseLock(`
      in -- top
      in -[S2]- s2 -[S1]- middle
      in -[S2]- out
      top >> s1 >> in
      top >> middle >> in
      S1 toggle @s1
      S2 toggle @s2
    `)
    expect(lockQuality(lock)).toEqual(["gate in-s2 does nothing"])
  })
})

describe("unreachedRegions", () => {
  it("names a region behind a gate only its own lever opens, and never a stretch", () => {
    expect(unreachedRegions(spec("in -[H]- out\nin -[S]- vault\nH toggle @in\nS toggle @vault"))).toEqual(["vault"])
    expect(unreachedRegions(spec("in -[H]- >> hall\nhall -- out\nH toggle @in"))).toEqual([])
  })
})
