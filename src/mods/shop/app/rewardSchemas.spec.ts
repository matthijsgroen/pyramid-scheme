import { describe, expect, it } from "vitest"
import { validatePlacedRewards } from "@/app/SiteMap/rewardSchemas"
import type { SiteConfig } from "@/game/siteTypes"
import "./index"

const worldSelling = (stock: { type: string; [key: string]: unknown }[]): Record<string, SiteConfig[]> => ({
  "made-up": [
    [
      {
        pathPuzzles: 0,
        difficulty: "junior",
        end: "treasure",
        exitOrStaircase: "exit",
        sideSections: [{ pathPuzzles: 0, difficulty: "junior", end: "treasure", rewards: stock }],
      },
    ],
  ],
})

describe("the shop's placed-reward schemas", () => {
  it("a world with a purchase in Fez's stock loads", () => {
    expect(() => validatePlacedRewards(worldSelling([{ type: "purchase", id: "made-up-animal" }]))).not.toThrow()
  })

  it("a purchase without an id is refused", () => {
    expect(() => validatePlacedRewards(worldSelling([{ type: "purchase" }]))).toThrow(/"purchase"/)
  })
})
