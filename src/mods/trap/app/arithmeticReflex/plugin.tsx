/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { useState, type FC } from "react"
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import { TrapCountdown } from "@/mods/trap/app/TrapCountdown"
import { TrapFamilyShell } from "@/mods/trap/app/TrapFamilyShell"
import { generate, type ArithmeticQuestion } from "@/mods/trap/game/arithmeticReflex/generate"
import { ARITHMETIC_REFLEX_META } from "@/mods/trap/game/arithmeticReflex/meta"
import { isModEnabled } from "@/mods/registeredMods"

type ChallengeProps = {
  question: ArithmeticQuestion
  timeLimit: number
  onPass: () => void
  onFail: () => void
}

export type { ArithmeticQuestion }

const ArithmeticReflexComponent: FC<ChallengeProps> = ({ question, timeLimit, onPass, onFail }) => {
  const { a, b, op, answer, choices } = question
  const [done, setDone] = useState(false)

  const handleChoice = (value: number) => {
    if (done) return
    setDone(true)
    if (value === answer) onPass()
    else onFail()
  }

  return (
    <div className="flex w-72 flex-col gap-4">
      <TrapCountdown timeLimit={timeLimit} onExpire={onFail} />

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

const ArithmeticReflexFamily: FamilyPlugin<ArithmeticQuestion>["Component"] = ({
  puzzle,
  ctx,
  journeys,
  onSolved,
  onCancel,
}) => (
  <TrapFamilyShell
    question={puzzle}
    ctx={ctx}
    journeys={journeys}
    onSolved={onSolved}
    onCancel={onCancel}
    ChallengeComponent={ArithmeticReflexComponent}
  />
)

// Gated on the mod: registerModApps imports this file unconditionally (static side-effect),
// so the enablement check lives here — trap off → no plugin in the registry → a trap-tagged room
// resolves via the family-absence pass-through (SiteMapScreen) instead of rendering a challenge.
if (isModEnabled("trap"))
  registerFamily({
    meta: ARITHMETIC_REFLEX_META,
    generate: (seed, ctx) => generate(seed, ctx.difficulty ?? "starter"),
    Component: ArithmeticReflexFamily,
  })
