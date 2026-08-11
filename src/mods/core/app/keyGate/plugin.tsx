/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { useTranslation } from "react-i18next"
import { registerFamily, type FamilyContext, type FamilyPlugin } from "@/app/families/familyRegistry"
import { KEY_GATE_META } from "@/mods/core/game/keyGate/meta"
import { wardKeyDifficulty } from "@/data/difficultyLevels"
import { useMergedKeyDisplay } from "@/app/SiteMap/keyProviders"
import { KeyIcon } from "@/ui/atoms/KeyIcon"

type KeyGatePuzzle = { satisfied: boolean }

// A gate has no content of its own — its only "puzzle" is the key precondition already
// carried on FamilyContext (requiredKeyId/ownedKeys, set by siteAssembler/SiteMapScreen).
// Soft-gated like every other encounter: always clickable, refuses to solve until satisfied.
const generate = (_seed: number, ctx: FamilyContext): KeyGatePuzzle => ({
  satisfied: !ctx.requiredKeyId || (ctx.ownedKeys?.has(ctx.requiredKeyId) ?? false),
})

const KeyGateComponent: FamilyPlugin["Component"] = ({ puzzle, ctx, onSolved, onCancel }) => {
  const { satisfied } = puzzle as KeyGatePuzzle
  const { t } = useTranslation("common")
  // A ward (tomb-key) gate carries the flavor of the tier that sealed it (merchant, noble, ...),
  // derived from its key's difficulty. Floor-key/color gates have no such theme.
  const wardDifficulty = ctx.gateVariant === "tomb-key" ? wardKeyDifficulty(ctx.requiredKeyId) : undefined
  const keyDisplay = useMergedKeyDisplay()
  const keySymbol = ctx.requiredKeyId ? keyDisplay(ctx.requiredKeyId)?.symbol : undefined
  // A floor-key door is identified by colour, not by a symbol: the key that opens it sits somewhere
  // on this same floor, in a chest wearing the matching badge. Say the colour outright — the tinted
  // door tile on the map is easy to miss, and "the right key" told the player nothing.
  const gateColor = ctx.gateVariant === "floor-key" ? (ctx.keyColor ?? "blue") : undefined
  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-black/85">
      <p className="font-pyramid text-2xl text-amber-300">{t("gate.title")}</p>
      {wardDifficulty && (
        <p className="max-w-xs text-center text-sm text-stone-400 italic">
          {t(`gate.wardDescription.${wardDifficulty}`)}
        </p>
      )}
      {/* The sign cut into the door: the key's own symbol, so a locked door says WHICH key it wants
          — the same glyph that treasure wears in the Collection. Mod-supplied (see keyProviders);
          a key whose owner has no symbol for it simply shows no mark. */}
      {keySymbol && (
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm text-stone-400">{t("gate.markedWith")}</p>
          <span className="font-mono text-5xl text-amber-200">{keySymbol}</span>
        </div>
      )}
      {gateColor && (
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm text-stone-400">{t("gate.needsKey")}</p>
          {/* Decorative: the colour is spelled out in the line below, so the icon needs no name of
              its own — one accessible name per fact. */}
          <KeyIcon color={gateColor} size={56} />
          <p className="font-pyramid text-lg text-amber-200">{t(`keys.${gateColor}`)}</p>
        </div>
      )}
      <p className="text-sm text-stone-300">
        {satisfied ? t("gate.unlocked") : gateColor ? t("gate.lockedColor") : t("gate.locked")}
      </p>
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
