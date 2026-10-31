import { describe, expect, it } from "vitest"
import { refuseModAuthoringProblems } from "@/mods/registeredMods"
import { campMod } from "./index"

describe("the camp mod's authoring check", () => {
  it("is a descriptor hook the build runs before placement", () => {
    expect(campMod.authoringProblems).toBeTypeOf("function")
    expect(() => refuseModAuthoringProblems([campMod])).not.toThrow()
  })
})
