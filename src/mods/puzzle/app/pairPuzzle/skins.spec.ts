import { describe, expect, it } from "vitest"
import { pairSkinFor } from "./skins"

describe("a pair board is dressed by its room's role", () => {
  it.each([
    ["cosmos", "beetles"],
    ["funerary", "mummies"],
    ["no-such-role", "mummies"],
    [undefined, "mummies"],
  ])("%s wears %s", (role, name) => {
    expect(pairSkinFor(role, undefined).name).toBe(name)
  })

  it("lets the lab pick a skin by theme", () => {
    expect(pairSkinFor("funerary", "beetles").name).toBe("beetles")
  })
})
