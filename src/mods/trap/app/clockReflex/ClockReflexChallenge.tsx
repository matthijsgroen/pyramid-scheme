import { useState, type FC } from "react"
import { TrapCountdown } from "@/mods/trap/app/TrapCountdown"
import type { ClockQuestion } from "@/mods/trap/game/clockReflex/generate"
import { ClockFace, DigitalTime } from "@/ui/atoms/ClockFace"

type Props = {
  question: ClockQuestion
  timeLimit: number
  onPass: () => void
  onFail: () => void
}

/** One face, four readings, and a bar running out: what time is this, before the mechanism fires. */
export const ClockReflexChallenge: FC<Props> = ({ question, timeLimit, onPass, onFail }) => {
  const [done, setDone] = useState(false)

  const answer = (choice: number) => {
    if (done) return
    setDone(true)
    if (choice === question.answer) onPass()
    else onFail()
  }

  return (
    <div className="flex w-72 flex-col gap-4">
      <TrapCountdown timeLimit={timeLimit} onExpire={onFail} />
      <ClockFace time={question.time} className="mx-auto w-48" />
      <div className="grid grid-cols-2 gap-3">
        {question.choices.map(choice => (
          <button
            key={choice}
            onClick={() => answer(choice)}
            className="rounded-lg border border-amber-800 bg-stone-800 py-4 font-pyramid text-2xl text-amber-200 tabular-nums transition-colors hover:bg-stone-700 active:bg-stone-600"
          >
            <DigitalTime time={choice} />
          </button>
        ))}
      </div>
    </div>
  )
}
