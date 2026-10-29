import { describe, expect, it } from "vitest"
import type { DecorationKind, FloorGrid, PropFootprint } from "@/game/siteTypes"
import { centreFallbacksByTier, describeCentreTally } from "./centreReport"
import type { SiteConfig } from "./types"

const BASIN: PropFootprint = { cols: 2, rows: 1, tall: 0, centre: true }
const footprintOf = (kind: DecorationKind): PropFootprint => (kind === "bones" ? BASIN : { cols: 1, rows: 1, tall: 0 })

const room = (decoration: DecorationKind, grown: boolean, roomType = "fork") => ({
  type: "room",
  roomType,
  decoration,
  ...(grown ? { grownRoom: {} } : {}),
})
const gridOf = (...cells: ReturnType<typeof room>[]) => ({ cells: [cells] }) as unknown as FloorGrid
const floor = (difficulty: string) => ({ difficulty }) as unknown as SiteConfig[number]

describe(centreFallbacksByTier, () => {
  it("counts stood and fell-back centre objects per tier, in rooms that may grow", () => {
    const configs = { j: [[floor("junior"), floor("expert")], [floor("junior")]] }
    const grids = [
      gridOf(room("bones", true), room("bones", false), room("lamp", false), room("bones", false, "encounter")),
      gridOf(room("bones", true)),
      gridOf(room("bones", false)),
    ]
    const tally = centreFallbacksByTier(
      configs,
      (_journey, levelNr, floorIndex) => grids[levelNr === 1 ? floorIndex : 2],
      footprintOf
    )
    expect(tally.junior).toEqual({ stood: 1, fellBack: 2 })
    expect(tally.expert).toEqual({ stood: 1, fellBack: 0 })
    expect(tally.starter).toEqual({ stood: 0, fellBack: 0 })
    expect(describeCentreTally(tally)).toContain("junior 1 stood, 2 fell back")
  })
})
