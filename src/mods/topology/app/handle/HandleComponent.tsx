import clsx from "clsx"
import { useTranslation } from "react-i18next"
import type { FamilyPlugin } from "@/app/families/familyRegistry"
import { MarkChip } from "@/app/SiteMap/mark"
import { HANDLE_SIDES } from "@/game/siteTypes"

// A lever's whole content is which side it hangs on: no board, no fail state (decision 4 — a lever is
// never unsolved), and every visit leaves it exactly where it was last thrown
// (FamilyMeta.stateIsTheMechanism). It is binary — left or right, nothing between and no third
// position — and pressing a side throws it there, any number of times in one visit; reEnterable is
// what lets the player come back and do it again later.
//
// EACH SIDE WEARS THE LEVER'S MARK and is named by its side alone, never by what it drives: what a
// side opens is a set of section AUTHORING ADDRESSES ("s0.1"), which is world-gen's vocabulary and
// means nothing to a player. The mark is the same pair every door this lever owns wears on the map, so
// the way to find out what a side opens is to throw it and go look — which is what the design asks the
// floor to teach (docs/mods/floor-topology-design.md, "Consequence confirms it").

export const HandleComponent: FamilyPlugin["Component"] = ({ ctx, journeys, onSolved }) => {
  const { t } = useTranslation("common")
  // Unread until the player throws it once, and that is the side the floor hung it on — a lever always
  // stands somewhere, so one side's doors are open before anybody touches it (mechanismDoors.ts).
  const current =
    journeys.getMechanismStates(ctx.journeyId).get(ctx.address) ?? ctx.mechanism?.initial ?? HANDLE_SIDES[0]

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
        {HANDLE_SIDES.map(side => (
          <button
            key={side}
            aria-pressed={current === side}
            className={buttonCls(current === side)}
            onClick={() => journeys.setMechanismState(ctx.address, side)}
          >
            {ctx.mark && <MarkChip mark={ctx.mark} />}
            {t(`handle.${side}`)}
          </button>
        ))}
      </div>
      <button onClick={onSolved} className="text-sm text-stone-400 hover:text-stone-200">
        {t("ui.backToMap")}
      </button>
    </div>
  )
}
