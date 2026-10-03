import { useTranslation } from "react-i18next"
import type { FamilyPlugin } from "@/app/families/familyRegistry"
import { legalTargets } from "@/game/mechanismDoors"
import { storedAtAddress } from "@/game/cellAddress"

// PLACEHOLDER SCREEN, reached only from the puzzle lab (FamilyMeta.actsOnArrival: real play lights the
// torch from the arrival prompt). No art exists for a torch yet; this is one button and a line of text.
export const TorchComponent: FamilyPlugin["Component"] = ({ ctx, journeys, onSolved }) => {
  const { t } = useTranslation("common")
  const mechanism = ctx.mechanism
  const current =
    storedAtAddress(journeys.getMechanismStates(ctx.journeyId), ctx.address, ctx.legacyAddress) ?? mechanism?.initial
  const [next] = mechanism && current !== undefined ? legalTargets(mechanism, current) : []

  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-black/85">
      <p className="font-pyramid text-2xl text-amber-300">{t("torch.name")}</p>
      <p className="max-w-xs text-center text-sm text-stone-400 italic">{t("torch.goal")}</p>
      {next === undefined ? (
        <p className="text-amber-200">{t("torch.lit")}</p>
      ) : (
        <button
          className="rounded bg-amber-600 px-6 py-2 text-amber-50"
          onClick={() => journeys.setMechanismState(ctx.address, next)}
        >
          {t("torch.invitation")}
        </button>
      )}
      <button onClick={onSolved} className="text-sm text-stone-400 hover:text-stone-200">
        {t("ui.backToMap")}
      </button>
    </div>
  )
}
