import { mulberry32, shuffle } from "@/game/random"
import type { Difficulty } from "@/data/difficultyLevels"

type Operation = "+" | "-" | "×"

export type ArithmeticQuestion = {
  a: number
  b: number
  op: Operation
  answer: number
  choices: number[] // 4 values, shuffled; one is the answer
}

const OPERAND_MAX: Record<Difficulty, number> = {
  starter: 10,
  junior: 10,
  expert: 12,
  master: 15,
  wizard: 20,
}

const OPERATIONS: Operation[] = ["+", "-", "×"]

const compute = (a: number, b: number, op: Operation): number => {
  if (op === "+") return a + b
  if (op === "-") return a - b
  return a * b
}

export const generate = (seed: number, difficulty: Difficulty): ArithmeticQuestion => {
  const rand = mulberry32(seed)
  const max = OPERAND_MAX[difficulty]
  const op = OPERATIONS[Math.floor(rand() * 3)]
  // For subtraction ensure a ≥ 2 so b < a is always achievable (answer > 0)
  const a = op === "-" ? 2 + Math.floor(rand() * (max - 1)) : 1 + Math.floor(rand() * max)
  const b = op === "-" ? 1 + Math.floor(rand() * (a - 1)) : 1 + Math.floor(rand() * max)
  const answer = compute(a, b, op)

  // Three distractors: ±1, ±2, ±3 offsets — deduplicate and avoid the real answer
  const offsets = shuffle([1, -1, 2, -2, 3, -3], rand)
  const distractors: number[] = []
  for (const d of offsets) {
    const v = answer + d
    if (v > 0 && !distractors.includes(v)) {
      distractors.push(v)
      if (distractors.length === 3) break
    }
  }

  const choices = shuffle([answer, ...distractors], rand)
  return { a, b, op, answer, choices }
}
