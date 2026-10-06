import clsx from "clsx"
import { useTranslation } from "react-i18next"
import type { FamilyPlugin } from "@/app/families/familyRegistry"
import { MarkChip } from "@/app/SiteMap/mark"
import { HANDLE_SIDES } from "@/game/siteTypes"
import { storedAtAddress } from "@/game/cellAddress"

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
//
// NEVER OPENED IN REAL PLAY (FamilyMeta.actsOnArrival): the arrival prompt itself throws the lever
// (src/app/SiteMap/useSiteNavigation.ts), so this screen is reached only from the puzzle lab, which
// renders any registered family's board regardless of how the map would open it.

export const HandleComponent: FamilyPlugin["Component"] = ({ ctx, journeys, onSolved }) => {
  const { t } = useTranslation("common")
  // A genuine handle's own states ARE `HANDLE_SIDES`; a control (FloorConfig.controls) authors its
  // own — doubleBack's S1 is `["start", "thrown"]`, never "left"/"right" — and may lead with one more
  // that only names where it starts (Y's "unset"). The last two are always the pair a press picks
  // between (throwMechanism, mechanismDoors.ts), whatever an author called them; the buttons still read
  // "left"/"right" — a control looks like a lever regardless of `encounter` (obstacles.ts) — but write
  // the mechanism's REAL state, not the label.
  const realStates = ctx.mechanism ? ctx.mechanism.states.slice(-2) : [...HANDLE_SIDES]
  // Unread until the player throws it once, and that is the side the floor hung it on — a lever always
  // stands somewhere, so one side's doors are open before anybody touches it (mechanismDoors.ts).
  const current =
    storedAtAddress(journeys.getMechanismStates(ctx.journeyId), ctx.address, ctx.legacyAddress) ??
    ctx.mechanism?.initial ??
    realStates[0]

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
        {HANDLE_SIDES.map((label, i) => {
          const value = realStates[i] ?? label
          return (
            <button
              key={label}
              aria-pressed={current === value}
              className={buttonCls(current === value)}
              onClick={() => journeys.setMechanismState(ctx.address, value)}
            >
              {ctx.mark && <MarkChip mark={ctx.mark} />}
              {t(`handle.${label}`)}
            </button>
          )
        })}
      </div>
      <button onClick={() => onSolved()} className="text-sm text-stone-400 hover:text-stone-200">
        {t("ui.backToMap")}
      </button>
    </div>
  )
}
