import clsx from "clsx"
import { useTranslation } from "react-i18next"
import type { FamilyPlugin } from "@/app/families/familyRegistry"
import { MarkChip } from "@/app/SiteMap/mark"
import { MECHANISM_AT_REST } from "@/app/state/useJourneys"

// A lever's whole content is which position it stands at: no board, no fail state (decision 4 — a
// lever is never unsolved), and every visit leaves it exactly where it was last thrown
// (FamilyMeta.stateIsTheMechanism). Pressing a position throws it there; pressing another does the
// same, any number of times in one visit — reEnterable is what lets the player come back and do it
// again later.
//
// EACH POSITION WEARS THE LEVER'S MARK and is numbered, never named: what a position drives is a
// section's AUTHORING ADDRESS ("s0.1"), which is world-gen's vocabulary and means nothing to a player.
// The mark is the same pair every door this lever owns wears on the map, so the way to find out what a
// position opens is to throw it and go look — which is what the design asks the floor to teach
// (docs/mods/floor-topology-design.md, "Consequence confirms it").
export const HandleComponent: FamilyPlugin["Component"] = ({ ctx, journeys, onSolved }) => {
  const { t } = useTranslation("common")
  const positions = ctx.mechanism?.positions ?? []
  // Unread until the player throws it once, and that is rest: no gate opens until then.
  const current = journeys.getMechanismStates(ctx.journeyId).get(ctx.address) ?? MECHANISM_AT_REST

  const buttonCls = (pressed: boolean) =>
    clsx(
      "flex items-center gap-3 rounded px-6 py-2",
      pressed ? "bg-amber-600 text-amber-50" : "bg-stone-800 text-stone-200 hover:bg-stone-700"
    )

  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-black/85">
      <p className="font-pyramid text-2xl text-amber-300">{t("handle.name")}</p>
      <p className="max-w-xs text-center text-sm text-stone-400 italic">{t("handle.goal")}</p>
      <div className="flex flex-col items-center gap-3">
        {positions.map(({ state }, index) => (
          <button
            key={state}
            aria-pressed={current === state}
            className={buttonCls(current === state)}
            onClick={() => journeys.setMechanismState(ctx.address, state)}
          >
            {ctx.mark && <MarkChip mark={ctx.mark} />}
            {t("handle.position", { number: index + 1 })}
          </button>
        ))}
        {ctx.mechanism?.restReachable && (
          <button
            aria-pressed={current === MECHANISM_AT_REST}
            className={buttonCls(current === MECHANISM_AT_REST)}
            onClick={() => journeys.setMechanismState(ctx.address, MECHANISM_AT_REST)}
          >
            {t("handle.rest")}
          </button>
        )}
      </div>
      <button onClick={onSolved} className="text-sm text-stone-400 hover:text-stone-200">
        {t("ui.backToMap")}
      </button>
    </div>
  )
}
