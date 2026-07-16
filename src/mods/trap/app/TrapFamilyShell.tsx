import { useState, type FC } from "react"
import type { FamilyContext } from "@/app/families/familyRegistry"
import type { JourneyAPI } from "@/app/state/useJourneys"
import { TRAP_TIME_LIMITS_SECONDS, TRAP_TIME_EXTENSION_PER_INSIGHT_STACK } from "@/mods/trap/game/trapConfig"
import { TrapWarningScreen } from "@/mods/trap/app/TrapWarningScreen"
import { useTrapProgress } from "./useTrapProgress"

// Generic across any trap family — the warning/attempt/disable/turn-around lifecycle has
// nothing challenge-specific about it. Only one trap family exists today (arithmetic-reflex)
// but a second one reuses this instead of re-deriving the same lifecycle. Health + consumables +
// perks come from the trap mod's own state (useTrapProgress): trap-insight extends the time limit,
// armor reduces damage (inside takeTrapDamage).
type Props<T> = {
  question: T
  ctx: FamilyContext
  journeys: JourneyAPI
  onSolved: () => void
  onCancel: () => void
  ChallengeComponent: FC<{ question: T; timeLimit: number; onPass: () => void; onFail: () => void }>
}

export const TrapFamilyShell = <T,>({ question, ctx, journeys, onSolved, onCancel, ChallengeComponent }: Props<T>) => {
  const trap = useTrapProgress()
  const [attempting, setAttempting] = useState(false)

  if (!attempting) {
    return (
      <TrapWarningScreen
        currentHealth={trap.currentHealth}
        maxHealth={trap.maxHealth}
        attemptSafe={trap.isTrapAttemptSafe()}
        consumables={trap.consumables}
        onAttempt={() => setAttempting(true)}
        onTurnAround={onCancel}
        onHeal={type => trap.useConsumable(type)}
        onDisable={() => {
          trap.useConsumable("trapTool")
          journeys.markTrapDisabled(ctx.sectionHash, ctx.edgeId)
          onCancel()
        }}
      />
    )
  }

  // trap-insight adds time only to already-timed traps — an untimed tier (base 0) stays untimed
  // (0 = no countdown; see arithmeticReflex plugin). Decided P1: don't turn a free trap into a timed one.
  const baseTime = TRAP_TIME_LIMITS_SECONDS[ctx.difficulty ?? "starter"]
  const timeLimit = baseTime > 0 ? baseTime + trap.trapInsightStacks * TRAP_TIME_EXTENSION_PER_INSIGHT_STACK : 0

  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-black/90">
      <ChallengeComponent
        question={question}
        timeLimit={timeLimit}
        onPass={onSolved}
        onFail={() => {
          trap.takeTrapDamage()
          onCancel()
        }}
      />
    </div>
  )
}
