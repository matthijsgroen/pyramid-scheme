/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { useEffect, useRef, useState } from "react"
import { mulberry32, shuffle } from "@/game/random"
import { registerTrap } from "@/game/trapRegistry"
import type { TrapPlugin } from "@/game/trapPlugin"
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

const generate = (seed: number, difficulty: Difficulty): ArithmeticQuestion => {
  const rand = mulberry32(seed)
  const max = OPERAND_MAX[difficulty]
  const op = OPERATIONS[Math.floor(rand() * 3)]
  const a = 1 + Math.floor(rand() * max)
  // For subtraction keep b ≤ a so result is positive
  const b = op === "-" ? 1 + Math.floor(rand() * a) : 1 + Math.floor(rand() * max)
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

const ArithmeticReflexComponent: TrapPlugin<ArithmeticQuestion>["Component"] = ({
  question,
  timeLimit,
  onPass,
  onFail,
}) => {
  const { a, b, op, answer, choices } = question
  const [done, setDone] = useState(false)
  const [barWidth, setBarWidth] = useState(100)
  const onFailRef = useRef(onFail)
  onFailRef.current = onFail

  useEffect(() => {
    // Trigger CSS transition on next frame
    const frame = requestAnimationFrame(() => setBarWidth(0))
    const timer = setTimeout(() => {
      if (!done) onFailRef.current()
    }, timeLimit * 1000)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(timer)
    }
  }, [timeLimit, done])

  const handleChoice = (value: number) => {
    if (done) return
    setDone(true)
    if (value === answer) onPass()
    else onFail()
  }

  return (
    <div className="flex w-72 flex-col gap-4">
      {/* Countdown bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-stone-700">
        <div
          className="h-full rounded-full bg-amber-400 transition-all ease-linear"
          style={{ width: `${barWidth}%`, transitionDuration: `${timeLimit}s` }}
        />
      </div>

      <p className="text-center font-pyramid text-4xl text-amber-200">
        {a} {op} {b} = ?
      </p>

      <div className="grid grid-cols-2 gap-3">
        {choices.map((c, i) => (
          <button
            key={i}
            onClick={() => handleChoice(c)}
            className="rounded-lg border border-amber-800 bg-stone-800 py-4 font-pyramid text-2xl text-amber-200 transition-colors hover:bg-stone-700 active:bg-stone-600"
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  )
}

registerTrap({
  family: "arithmetic-reflex",
  generate,
  Component: ArithmeticReflexComponent,
})
