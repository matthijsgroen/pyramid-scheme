import { useState, type FC } from "react"
import { TrapCountdown } from "@/mods/trap/app/TrapCountdown"
import { useChoiceKeys } from "@/mods/trap/app/useChoiceKeys"
import type { ArithmeticQuestion } from "@/mods/trap/game/arithmeticReflex/generate"

type Props = {
  question: ArithmeticQuestion
  timeLimit: number
  onPass: () => void
  onFail: () => void
}

/** A sum and four answers, and a bar running out. */
export const ArithmeticReflexChallenge: FC<Props> = ({ question, timeLimit, onPass, onFail }) => {
  const { a, b, op, answer, choices } = question
  const [done, setDone] = useState(false)

  const handleChoice = (value: number) => {
    if (done) return
    setDone(true)
    if (value === answer) onPass()
    else onFail()
  }
  const keys = useChoiceKeys(choices.length, index => handleChoice(choices[index]))

  return (
    <div className="flex w-72 flex-col gap-4">
      <TrapCountdown timeLimit={timeLimit} onExpire={onFail} />

      <p className="text-center font-pyramid text-4xl text-amber-200">
        {a} {op} {b} = ?
      </p>

      <div ref={keys} className="board-focus grid grid-cols-2 gap-3">
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
