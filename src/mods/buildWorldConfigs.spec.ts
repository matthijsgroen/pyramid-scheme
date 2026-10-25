import { describe, expect, it } from "vitest"
import type { FloorConfig, SiteConfig } from "@/worldGen/types"
import { pinsFrom } from "./buildWorldConfigs"

const floor = (pin: Partial<Pick<FloorConfig, "seed" | "packing">> = {}): FloorConfig => ({
  pathPuzzles: 1,
  difficulty: "starter",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  ...pin,
})

describe(pinsFrom, () => {
  it("pinsFrom copies seed and packing from the baked world onto every floor", () => {
    const baked: Record<string, SiteConfig[]> = {
      made_up: [
        [floor({ seed: 11, packing: 0.4 }), floor({ seed: 12, packing: 0.6 })],
        [floor({ seed: 21, packing: 1 })],
      ],
      other: [[floor({ seed: 31, packing: 0.5 })]],
    }
    const configs: Record<string, SiteConfig[]> = {
      made_up: [[floor(), floor({ seed: 99, packing: 0.9 })], [floor()]],
      other: [[floor()]],
    }
    pinsFrom(baked)(configs)
    const pins = (world: Record<string, SiteConfig[]>) =>
      Object.values(world).map(sites => sites.map(site => site.map(f => [f.seed, f.packing])))
    expect(pins(configs)).toEqual(pins(baked))
  })

  it("leaves a floor the baked world does not have as it is", () => {
    const configs: Record<string, SiteConfig[]> = { made_up: [[floor({ seed: 5 })]], unbaked: [[floor()]] }
    pinsFrom({ made_up: [[floor({ seed: 11, packing: 0.4 })]] })(configs)
    expect(configs.made_up[0][0]).toMatchObject({ seed: 11, packing: 0.4 })
    expect(configs.unbaked[0][0].seed).toBeUndefined()
  })
})
