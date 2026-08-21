import { describe, expect, it } from "vitest"
import { getFamilyPlugin } from "@/app/families/familyRegistry"
import { difficulties, type Difficulty } from "@/data/difficultyLevels"
import type { ClockQuestion } from "@/mods/trap/game/clockReflex/generate"
import "./plugin"

const generate = (seed: number, difficulty: Difficulty) =>
  getFamilyPlugin("clock-reflex")!.generate(seed, {
    journeyId: "test",
    edgeId: "test",
    sectionHash: "test",
    freshArrival: true,
    difficulty,
  }) as ClockQuestion

describe("clock reflex plugin", () => {
  it("registers as a trap family", () => {
    expect(getFamilyPlugin("clock-reflex")?.meta.tags).toContain("trap")
  })

  it.each(difficulties)("generates a %s question through the registry", difficulty => {
    const question = generate(4, difficulty)
    expect(question.choices).toContain(question.answer)
    expect(question.choices).toHaveLength(4)
  })
})
