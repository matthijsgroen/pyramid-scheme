import { describe, expect, it } from "vitest"
import { SECONDARY_TOMBS, validateDiscovery, validateRewardCounts } from "./validate"
import { WORLD_TARGETS } from "./worldSpec"
import { PYRAMID_JOURNEYS } from "./data"
import type { FloorConfig, SiteConfig } from "./types"

const floor = (overrides: Partial<FloorConfig> = {}): FloorConfig => ({
  pathPuzzles: 1,
  difficulty: "starter",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  ...overrides,
})

const fillMosaics = (n: number): FloorConfig["sideSections"] =>
  Array.from({ length: n }, () => ({
    pathPuzzles: 0,
    difficulty: "starter" as const,
    end: "treasure" as const,
    endReward: { type: "mosaicPiece" as const },
  }))

describe("validateRewardCounts", () => {
  it("throws when a non-last floor is set to exit incorrectly", () => {
    const configs = { site: [[floor({ exitOrStaircase: "staircase" })]] as SiteConfig[] }
    expect(() => validateRewardCounts(configs)).toThrow(/expected "exit"/)
  })

  it("throws when mapPiece count doesn't match WORLD_TARGETS", () => {
    const configs = { site: [[floor()]] as SiteConfig[] }
    expect(() => validateRewardCounts(configs)).toThrow(new RegExp(`Expected ${WORLD_TARGETS.mapPieceRewards} map`))
  })

  it("throws when a mapPiece references an unknown journey id", () => {
    const configs = {
      site: [
        [
          floor({
            sideSections: [
              {
                pathPuzzles: 0,
                difficulty: "starter",
                end: "treasure",
                endReward: { type: "mapPiece", tombId: "not_real" },
              },
            ],
          }),
        ],
      ] as SiteConfig[],
    }
    expect(() => validateRewardCounts(configs)).toThrow(/unknown journey IDs/)
  })

  it("passes when counts exactly match WORLD_TARGETS and all mapPiece ids are known", () => {
    const realTombId = PYRAMID_JOURNEYS[0].id
    const configs = {
      [realTombId]: [
        [
          floor({
            sideSections: [
              ...fillMosaics(WORLD_TARGETS.mosaicPieceRewards),
              ...Array.from({ length: WORLD_TARGETS.mapPieceRewards }, () => ({
                pathPuzzles: 0,
                difficulty: "starter" as const,
                end: "treasure" as const,
                endReward: { type: "mapPiece" as const, tombId: realTombId },
              })),
            ],
          }),
        ],
      ] as SiteConfig[],
    }
    expect(() => validateRewardCounts(configs)).not.toThrow()
  })
})

describe("validateDiscovery", () => {
  it("throws when a secondary tomb has no reachable mapPiece", () => {
    const configs = {
      expert_treasure_tomb: [[floor()]] as SiteConfig[],
      expert_treasure_tomb_b: [[floor()]] as SiteConfig[],
    }
    expect(() => validateDiscovery(configs)).toThrow(/expert_treasure_tomb_b/)
  })

  it("passes once every SECONDARY_TOMBS entry has a mapPiece hosted on a reachable site", () => {
    const configs: Record<string, SiteConfig[]> = {}
    for (const [primaryId, secondaryIds] of Object.entries(SECONDARY_TOMBS)) {
      configs[primaryId] ??= [[floor()]]
      for (const secondaryId of secondaryIds) {
        configs[primaryId][0][0].sideSections.push({
          pathPuzzles: 0,
          difficulty: "starter",
          end: "treasure",
          endReward: { type: "mapPiece", tombId: secondaryId },
        })
        configs[secondaryId] ??= [[floor()]]
      }
    }
    expect(() => validateDiscovery(configs)).not.toThrow()
  })
})
