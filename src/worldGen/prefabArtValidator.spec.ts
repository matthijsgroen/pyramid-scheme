import { describe, expect, it, vi } from "vitest"
import type { Prefab } from "@/game/prefabTypes"
import type { FloorConfig } from "./types"
import type { GateWalk } from "./gateWalk"

const painted = new Set<string>()
vi.mock("./tileArt", () => ({ hasTileArt: (tier: string, kind: string) => painted.has(`${tier}/${kind}`) }))
const { prefabArtValidator } = await import("./prefabArtValidator")

const prefab = (kinds: string[]): Prefab => ({
  name: "madeUpHall",
  tier: "junior",
  mirror: false,
  layouts: [],
  specials: {},
  places: { a: { letter: "a", layer: "floor", optional: false, kinds: kinds as never, cols: 1, rows: 1 } },
})
const floor = (kinds: string[], extra: Partial<FloorConfig> = {}): FloorConfig =>
  ({
    difficulty: "junior",
    sideSections: [],
    prefabs: { madeUpHall: prefab(kinds) },
    prefabPlacements: [{ room: "madeUpHall", min: 1, max: 1, central: 0 }],
    ...extra,
  }) as unknown as FloorConfig
const run = (f: FloorConfig) => prefabArtValidator({ madeUp: [[f]] }, [], (() => ({})) as unknown as GateWalk)

describe("prefabArtValidator", () => {
  it("names the room, the floor and the kind with no art", () => {
    painted.clear()
    expect(() => run(floor(["jar"]))).toThrow(
      "[worldSpec] Room prefab art missing: madeUpHall on madeUp[0] floor 0 needs jar (junior)"
    )
  })
  it("passes when every kind is painted in the floor's tileset", () => {
    painted.clear()
    painted.add("cave/jar")
    expect(() => run(floor(["jar"], { tileset: "cave" }))).not.toThrow()
  })
  it("needs the patron statue only on a floor with a patron", () => {
    painted.clear()
    painted.add("junior/jar")
    expect(() => run(floor(["patron", "jar"]))).not.toThrow()
    expect(() => run(floor(["patron", "jar"], { patron: "anubis" }))).toThrow("needs statue (junior)")
    painted.add("junior/statue-anubis")
    expect(() => run(floor(["patron", "jar"], { patron: "anubis" }))).not.toThrow()
  })
})
