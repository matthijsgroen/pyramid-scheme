import { describe, expect, it } from "vitest"
import type { SiteConfig } from "@/game/siteTypes"
import { journeyBuriedPercent } from "./buriedPercent"

type Door = { key: string; seam: number }
type Front = { input: string; key: string }
/** A made-up main floor of `puzzles + 1` rooms: its doors at seams, and the stops a lock's fronts added. */
const floor = (puzzles: number, doors: Door[] = [], fronts: Front[] = []) => ({
  pathPuzzles: puzzles,
  exitOrStaircase: "exit",
  webDoors: doors.map(door => ({ key: door.key, at: { seam: door.seam } })),
  locks: fronts.length
    ? [
        {
          web: {
            fronts: fronts.map(front => ({ input: front.input, region: "r" })),
            inputs: Object.fromEntries(fronts.map(front => [front.input, front.key])),
          },
        },
      ]
    : [],
})
const journey = (...pyramids: object[][]) => pyramids as unknown as SiteConfig[]

const activators = [
  { name: "a", pots: ["w1p2"] },
  { name: "b", pots: ["w1p2"] },
  { name: "c", pots: ["w1p2"] },
  { name: "d", pots: ["w1"] },
]

describe("journeyBuriedPercent", () => {
  // p1 has 4 rooms, p2 has 6: a line of 10, the sand of p2 from room 5 on.
  const doors = [
    { key: "web:w1p2#1", seam: 0 },
    { key: "web:w1p2#2", seam: 2 },
    { key: "web:w1p2#3", seam: 4 },
  ]
  const sites = journey([floor(3)], [floor(5, doors)])

  it("shows the pot's share of the line before any pull", () => {
    expect(journeyBuriedPercent(sites, activators, {})).toBe(50)
  })

  it("lowers to the next stop with each pull, whichever lever", () => {
    expect(journeyBuriedPercent(sites, activators, { b: true })).toBe(30)
    expect(journeyBuriedPercent(sites, activators, { b: true, c: true })).toBe(10)
  })

  it("hides the line once everything is pulled", () => {
    expect(journeyBuriedPercent(sites, activators, { a: true, b: true, c: true })).toBeUndefined()
  })

  it("counts a pot with a from only from its start", () => {
    const from = journey([floor(3)], [floor(5, [{ key: "web:w1p2#1", seam: 3 }])])
    expect(journeyBuriedPercent(from, [{ name: "a", pots: ["w1p2"] }], {})).toBe(20)
  })

  it("counts a journey pot to the end of the journey", () => {
    const pot = journey([floor(3, [{ key: "web:w1#1", seam: 1 }])], [floor(5)])
    expect(journeyBuriedPercent(pot, activators, {})).toBe(80)
    expect(journeyBuriedPercent(pot, activators, { d: true })).toBeUndefined()
  })

  it("counts a stop inside a lock from the start of its floor", () => {
    const inLock = journey([floor(3)], [floor(5, [], [{ input: "W1", key: "web:w1p2#1" }])])
    expect(journeyBuriedPercent(inLock, activators, {})).toBe(60)
  })

  it("shows 1% rather than 0% while anything is buried", () => {
    const long = journey([floor(299, [{ key: "web:w1p1#1", seam: 298 }])])
    expect(journeyBuriedPercent(long, [{ name: "a", pots: ["w1p1"] }], {})).toBe(1)
  })

  it("ignores seals an activator opens and doors off the main line", () => {
    const other = journey([
      {
        ...floor(3),
        webDoors: [
          { key: "web:ankh", at: { seam: 1 } },
          { key: "web:w1p1#1", at: { section: "s0", seam: 0 } },
          { key: "web:w1p1#1", at: { mouth: "s0" } },
        ],
      },
    ])
    expect(journeyBuriedPercent(other, activators, {})).toBeUndefined()
  })

  it("says nothing for a journey without sand", () => {
    expect(journeyBuriedPercent(journey([floor(3)], [floor(5)]), activators, {})).toBeUndefined()
  })
})
