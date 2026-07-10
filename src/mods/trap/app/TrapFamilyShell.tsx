import { useState, type FC } from "react"
import type { FamilyContext } from "@/app/families/familyRegistry"
import type { ProgressionAPI } from "@/app/state/useProgression"
import type { JourneyAPI } from "@/app/state/useJourneys"
import { TRAP_TIME_LIMITS_SECONDS, TRAP_TIME_EXTENSION_PER_INSIGHT_STACK } from "@/game/traps/trapConfig"
import { TrapWarningScreen } from "@/app/SiteMap/TrapWarningScreen"

// Generic across any trap family — the warning/attempt/disable/turn-around lifecycle has
// nothing challenge-specific about it. Only one trap family exists today (arithmetic-reflex)
// but a second one reuses this instead of re-deriving the same lifecycle.
type Props<T> = {
  question: T
  ctx: FamilyContext
  progression: ProgressionAPI
  journeys: JourneyAPI
  onSolved: () => void
  onCancel: () => void
  ChallengeComponent: FC<{ question: T; timeLimit: number; onPass: () => void; onFail: () => void }>
}

export const TrapFamilyShell = <T,>({
  question,
  ctx,
  progression,
  journeys,
  onSolved,
  onCancel,
  ChallengeComponent,
}: Props<T>) => {
  const [attempting, setAttempting] = useState(false)

  if (!attempting) {
    return (
      <TrapWarningScreen
        currentHealth={progression.currentHealth}
        maxHealth={progression.maxHealth}
        canAttempt={progression.canAttemptTrap()}
        trapToolCount={progression.consumables.trapTool}
        onAttempt={() => setAttempting(true)}
        onTurnAround={onCancel}
        onDisable={() => {
          progression.useConsumable("trapTool")
          journeys.markTrapDisabled(ctx.sectionHash, ctx.edgeId)
          onCancel()
        }}
      />
    )
  }

  const timeLimit =
    TRAP_TIME_LIMITS_SECONDS[ctx.difficulty ?? "starter"] +
    progression.perks.trapInsightStacks * TRAP_TIME_EXTENSION_PER_INSIGHT_STACK

  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-black/90">
      <ChallengeComponent
        question={question}
        timeLimit={timeLimit}
        onPass={onSolved}
        onFail={() => {
          progression.takeTrapDamage(progression.perks.armorStacks)
          onCancel()
        }}
      />
    </div>
  )
}
