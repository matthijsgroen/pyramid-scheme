import { beforeAll, describe, expect, it } from "vitest"
import { buildWorldConfigs } from "@/mods/buildWorldConfigs"
import { ALL_FAMILY_META } from "@/mods/allFamilyMeta"
import { configHash } from "@/game/seeds/configHash"
import { FORK_SHAPES } from "@/game/forkShape"
import { seedDemandOf } from "./seedDemand"
import { findUnbakedSwitchBoards } from "./validate"
import type { SiteConfig } from "./types"

let world: Record<string, SiteConfig[]>

beforeAll(() => {
  world = buildWorldConfigs(0)
}, 180_000)

const hashOf = (familyId: string, difficulty: string, forkShape: string) => {
  const seedable = ALL_FAMILY_META.find(family => family.id === familyId)?.seedable
  return configHash(seedable!.resolveOptions({ difficulty: difficulty as never, forkShape: forkShape as never }))
}

describe("seed demand read from the spec-built world", () => {
  it("asks for the expert lightbeamSwitch boards the expert_1 pyramid 4 lock needs, in every fork shape", () => {
    const demand = seedDemandOf(world, ALL_FAMILY_META)
    const labels = demand
      .filter(entry => entry.familyId === "lightbeamSwitch" && entry.difficulty === "expert")
      .map(entry => entry.ctx.forkShape)
    expect([...FORK_SHAPES].filter(shape => labels.includes(shape))).toEqual([...FORK_SHAPES])
    // Said against the floor itself, so a demand met by some other floor would not satisfy it.
    expect(world.expert_1[3][0].difficulty).toBe("expert")
  })

  it("asks for exactly the switch boards the world build requires seeds for", () => {
    const required = new Set(
      findUnbakedSwitchBoards(world, ALL_FAMILY_META, {}).map(board =>
        hashOf(board.familyId, board.difficulty, board.forkShape)
      )
    )
    const switchDemand = new Set(
      seedDemandOf(world, ALL_FAMILY_META)
        .filter(entry => entry.ctx.forkShape)
        .map(entry => entry.hash)
    )
    expect(switchDemand).toEqual(required)
  })
})
