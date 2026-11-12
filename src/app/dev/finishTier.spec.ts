import { describe, expect, it, vi } from "vitest"
import type { FloorGrid, TreasureReward } from "@/game/siteTypes"
import type { Journey } from "@/data/journeys"
import { createJourneysV3Api, type StoredJourneyStateV3 } from "@/app/state/useJourneys"
import type { TranslatedJourney } from "@/app/translations/useJourneyTranslations"
import { currentChapter } from "@/app/pages/journeyAvailability"
import { cellAddress } from "@/app/SiteMap/cellIdentity"
import { finishTier } from "./finishTier"

type MadeUp = Pick<Journey, "id" | "difficulty" | "levelCount" | "siteConfigs">

const journey = (id: string, difficulty: Journey["difficulty"], levelCount: number): MadeUp => ({
  id,
  difficulty,
  levelCount,
  siteConfigs: Array.from({ length: levelCount }, () => [{}]) as unknown as Journey["siteConfigs"],
})

const JOURNEYS = [
  journey("starter_a", "starter", 2),
  journey("starter_tomb", "starter", 1),
  journey("junior_a", "junior", 1),
]

// One room holding `reward`, and the corridor beside it.
const floorHolding = (section: string, reward?: TreasureReward): FloorGrid =>
  ({
    rows: 1,
    cols: 2,
    cells: [
      [
        { type: "room", roomType: "encounter", family: "madeUp", pathIndex: 0, sectionAddress: section, reward },
        { type: "corridor", sectionAddress: section, ordinal: "1" },
      ],
    ],
  }) as unknown as FloorGrid

const REWARDS: Record<string, TreasureReward> = {
  starter_a: { type: "coin" },
  starter_tomb: { type: "tombKey", keyId: "starter_a_1" },
  junior_a: { type: "coin" },
}

const setUp = () => {
  let stored: StoredJourneyStateV3[] = []
  const setJourneys = (v: StoredJourneyStateV3[] | ((prev: StoredJourneyStateV3[]) => StoredJourneyStateV3[])) => {
    stored = typeof v === "function" ? v(stored) : v
  }
  const api = () =>
    createJourneysV3Api({
      journeys: stored,
      journeyData: JOURNEYS as unknown as TranslatedJourney[],
      setJourneys,
    })
  const held = new Set<string>()
  const claim = vi.fn((reward: TreasureReward) => {
    if (reward.type === "tombKey") held.add(reward.keyId as string)
    return true
  })
  const finish = () =>
    finishTier({
      tier: "starter",
      journeys: JOURNEYS,
      assemble: journeyId => levelNr => floorHolding(`${journeyId}-${levelNr}`, REWARDS[journeyId]),
      progress: api(),
      claim,
    })
  return { api, held, claim, finish }
}

describe("finishing a tier", () => {
  it("leaves every journey of the tier played to its end, and no journey of another tier started", () => {
    const { api, finish } = setUp()

    finish()

    for (const id of ["starter_a", "starter_tomb"]) {
      const finished = api().getJourney(id)
      expect(finished?.completionCount).toBe(1)
      expect(finished?.progressPercentage).toBe(1)
      expect(finished?.active).toBe(false)
    }
    expect(api().getJourney("junior_a")).toBeUndefined()
  })

  it("opens the next chapter with the keys its floors hand out", () => {
    const { held, finish } = setUp()

    finish()

    expect(currentChapter(held, () => true)).toBe("junior")
  })

  it("claims each reward once, however often it is pressed", () => {
    const { claim, finish, api } = setUp()

    finish()
    const explored = api().exploredAddresses("starter_a")
    finish()

    expect(claim).toHaveBeenCalledTimes(3)
    expect(api().exploredAddresses("starter_a")).toEqual(explored)
  })

  it("does not claim again what the player already explored", () => {
    const { claim, finish, api } = setUp()
    void api().enterAt("starter_a", 1, cellAddress(floorHolding("starter_a-1"), 0, 0, 0), true)

    finish()

    expect(claim).toHaveBeenCalledTimes(2)
  })
})
