import { describe, expect, it } from "vitest"
import { difficulties } from "@/data/difficultyLevels"
import type { ArithmeticQuestion } from "@/app/TrapFamilies/ArithmeticReflex/plugin"
import "@/app/TrapFamilies/ArithmeticReflex/plugin"
import { getTrapPlugin } from "@/game/trapRegistry"
import type { Difficulty } from "@/data/difficultyLevels"

const generate = (seed: number, difficulty: Difficulty) =>
  getTrapPlugin("arithmetic-reflex")!.generate(seed, difficulty) as ArithmeticQuestion

describe("ArithmeticReflex generator", () => {
  describe.each(difficulties)("%s difficulty", difficulty => {
    it.each(Array.from({ length: 20 }, (_, i) => i))("seed %d produces a valid question", seed => {
      const q = generate(seed, difficulty)

      // answer is correct
      if (q.op === "+") expect(q.answer).toBe(q.a + q.b)
      if (q.op === "-") expect(q.answer).toBe(q.a - q.b)
      if (q.op === "×") expect(q.answer).toBe(q.a * q.b)

      // subtraction keeps result positive
      if (q.op === "-") expect(q.answer).toBeGreaterThan(0)

      // all operands positive
      expect(q.a).toBeGreaterThan(0)
      expect(q.b).toBeGreaterThan(0)

      // exactly 4 choices, all positive, all distinct
      expect(q.choices).toHaveLength(4)
      expect(q.choices.every(c => c > 0)).toBe(true)
      expect(new Set(q.choices).size).toBe(4)

      // answer is among the choices
      expect(q.choices).toContain(q.answer)
    })

    it("is deterministic — same seed always returns the same question", () => {
      const a = generate(42, difficulty)
      const b = generate(42, difficulty)
      expect(a).toEqual(b)
    })
  })
})
