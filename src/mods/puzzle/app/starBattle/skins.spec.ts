import { describe, expect, it } from "vitest"
import type { StarBattlePuzzle } from "@/mods/puzzle/game/starBattle/starBattle"
import { skinFor } from "./skins"

const walled: StarBattlePuzzle = { size: 2, quota: 1, walls: [false, false, false, true] }
const regioned: StarBattlePuzzle = { size: 2, quota: 1, regions: [0, 0, 1, 1] }

describe("a walled board is dressed by its room's role", () => {
  it.each([
    ["light", "lamps"],
    ["trade", "market"],
    ["water", "lotus"],
    ["funerary", "cats"],
    ["no-such-role", "lamps"],
    [undefined, "lamps"],
  ])("%s wears %s", (role, name) => {
    expect(skinFor(walled, role, undefined).name).toBe(name)
  })

  it("lets the lab pick a skin by theme", () => {
    expect(skinFor(walled, "light", "cats").name).toBe("cats")
  })
})

describe("a board with regions keeps star battle's own skins", () => {
  it.each([
    ["sky", "default"],
    ["agriculture", "fields"],
    ["trade", "default"],
  ])("%s wears %s", (role, name) => {
    expect(skinFor(regioned, role, undefined).name).toBe(name)
  })
})
