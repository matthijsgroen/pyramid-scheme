import { describe, expect, it } from "vitest"
import { difficulties } from "@/data/difficultyLevels"
import { digitalTime, handsSwapped } from "@/game/clock/clockFace"
import { generate } from "./generate"

const questions = (difficulty: (typeof difficulties)[number], count = 40) =>
  Array.from({ length: count }, (_unused, seed) => generate(seed + 1, difficulty))

describe("clock reflex generation", () => {
  it.each(difficulties)("offers %s readings: four distinct, one of them the face", difficulty => {
    for (const question of questions(difficulty)) {
      expect(question.choices).toHaveLength(4)
      expect(new Set(question.choices).size).toBe(4)
      expect(question.choices).toContain(question.answer)
      expect(question.answer).toBe(question.time)
    }
  })

  it("keeps a starter face on the half hours", () => {
    for (const question of questions("starter"))
      for (const choice of question.choices) expect(digitalTime(choice)).toMatch(/:(00|30)$/)
  })

  it("offers the hand-swap misreading whenever the face has one", () => {
    const swappable = questions("expert").filter(question => {
      const twin = handsSwapped(question.time)
      return twin !== undefined && twin !== question.time && twin % 5 === 0
    })
    expect(swappable.length).toBeGreaterThan(30)
    for (const question of swappable) expect(question.choices).toContain(handsSwapped(question.time))
  })

  it("draws the same question for the same seed", () => {
    expect(generate(42, "master")).toEqual(generate(42, "master"))
  })
})
