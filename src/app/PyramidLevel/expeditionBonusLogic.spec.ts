import { describe, it, expect } from "vitest"
import { determineExpeditionBonus } from "./expeditionBonusLogic"
import type { CombinedJourneyState } from "@/app/state/useJourneys"
import type { Treasure } from "@/data/treasures"

const makeJourney = (
  difficulty: "starter" | "junior" | "expert" | "master" | "wizard",
  levelNr: number,
  levelCount: number
): CombinedJourneyState =>
  ({
    journeyId: "test",
    levelNr,
    randomSeed: 12345,
    completionCount: 0,
    journey: { difficulty, levelCount, type: "pyramid" },
  }) as unknown as CombinedJourneyState

const makeTreasure = (tier: "stone" | "bronze" | "silver" | "gold" | "divine", amount = 1): Treasure =>
  ({ id: `t_${tier}`, name: tier, effects: { expeditionBonus: { amount, tier } } }) as Treasure

describe("determineExpeditionBonus", () => {
  it("returns [] when not on the last level", () => {
    const journey = makeJourney("starter", 2, 5)
    expect(determineExpeditionBonus(journey, [makeTreasure("stone")])).toEqual([])
  })

  it("returns [] when no treasures have expeditionBonus", () => {
    const journey = makeJourney("starter", 5, 5)
    const treasure = { id: "t1", name: "no bonus", effects: {} } as Treasure
    expect(determineExpeditionBonus(journey, [treasure])).toEqual([])
  })

  it("returns items on matching tier expedition (stone treasure on starter expedition)", () => {
    const journey = makeJourney("starter", 5, 5)
    const result = determineExpeditionBonus(journey, [makeTreasure("stone")])
    expect(result).toHaveLength(1)
  })

  it("returns no items when expedition tier does not match treasure tier", () => {
    const journey = makeJourney("junior", 5, 5)
    expect(determineExpeditionBonus(journey, [makeTreasure("stone")])).toEqual([])
  })

  it("returns no stone items on a silver expedition", () => {
    const journey = makeJourney("expert", 5, 5)
    expect(determineExpeditionBonus(journey, [makeTreasure("stone"), makeTreasure("bronze")])).toEqual([])
  })

  it("returns items when silver treasure matches expert expedition", () => {
    const journey = makeJourney("expert", 5, 5)
    const result = determineExpeditionBonus(journey, [makeTreasure("stone"), makeTreasure("silver")])
    expect(result).toHaveLength(1)
  })

  it("stacks multiple matching-tier treasures", () => {
    const journey = makeJourney("starter", 5, 5)
    const result = determineExpeditionBonus(journey, [makeTreasure("stone", 1), makeTreasure("stone", 1)])
    expect(result).toHaveLength(2)
  })

  it("ignores non-matching tiers even when other tiers are present", () => {
    const journey = makeJourney("junior", 5, 5)
    const result = determineExpeditionBonus(journey, [
      makeTreasure("stone"),
      makeTreasure("bronze"),
      makeTreasure("silver"),
    ])
    expect(result).toHaveLength(1)
  })
})
