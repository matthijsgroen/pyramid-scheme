import { describe, expect, it } from "vitest"
import { sceneFor } from "./sceneFor"

describe(sceneFor, () => {
  it("names a tier's beat after the tomb it stands in", () => {
    expect(sceneFor("starter_treasure_tomb")).toBe("tomb.starter")
  })

  it("keeps a secondary tomb's own scene apart, as the script writes it", () => {
    expect(sceneFor("wizard_treasure_tomb_b")).toBe("tomb.wizardB")
    expect(sceneFor("wizard_treasure_tomb_c")).toBe("tomb.wizardC")
  })

  it("has nothing to say for a pyramid, whose beat is its arrival", () => {
    expect(sceneFor("starter_1")).toBeUndefined()
  })
})
