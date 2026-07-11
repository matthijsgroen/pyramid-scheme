/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { useTranslation } from "react-i18next"
import { registerFamily, type FamilyContext, type FamilyPlugin } from "@/app/families/familyRegistry"
import { KEY_GATE_META } from "@/mods/core/game/keyGate/meta"

type KeyGatePuzzle = { satisfied: boolean }

// A gate has no content of its own — its only "puzzle" is the key precondition already
// carried on FamilyContext (requiredKeyId/ownedKeys, set by siteAssembler/SiteMapScreen).
// Soft-gated like every other encounter: always clickable, refuses to solve until satisfied.
const generate = (_seed: number, ctx: FamilyContext): KeyGatePuzzle => ({
  satisfied: !ctx.requiredKeyId || (ctx.ownedKeys?.has(ctx.requiredKeyId) ?? false),
})

const KeyGateComponent: FamilyPlugin["Component"] = ({ puzzle, onSolved, onCancel }) => {
  const { satisfied } = puzzle as KeyGatePuzzle
  const { t } = useTranslation("common")
  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-black/85">
      <p className="font-pyramid text-2xl text-amber-300">{t("gate.title")}</p>
      <p className="text-sm text-stone-300">{satisfied ? t("gate.unlocked") : t("gate.locked")}</p>
      <div className="flex flex-col items-center gap-3">
        {satisfied && (
          <button onClick={onSolved} className="rounded bg-amber-700 px-6 py-2 text-amber-100 hover:bg-amber-600">
            {t("gate.pass")}
          </button>
        )}
        <button onClick={onCancel} className="text-sm text-stone-400 hover:text-stone-200">
          {t("gate.turnAround")}
        </button>
      </div>
    </div>
  )
}

registerFamily({
  meta: KEY_GATE_META,
  generate,
  Component: KeyGateComponent,
})
