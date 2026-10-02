import { useTranslation } from "react-i18next"
import type { FamilyPlugin } from "@/app/families/familyRegistry"
import { getFamilyPlugin } from "@/app/families/familyRegistry"
import type { GateOwnerIcon } from "@/game/gateFace"
import { GateFacePanel } from "@/ui/atoms/GateFacePanel"
import { KeyIcon } from "@/ui/atoms/KeyIcon"

const iconFor = (icon: GateOwnerIcon) =>
  icon.kind === "key" ? (
    <KeyIcon color={icon.color ?? "blue"} size={40} />
  ) : (
    <span aria-hidden="true">{getFamilyPlugin(icon.family)?.meta.icon ?? "◇"}</span>
  )

// A door shows what it waits for: one marker per owner, lit as that owner stands, and the order of any
// sequence, tile by tile. Reading changes no state; only the explicit start-again writes one, and the door
// opens when its condition is met, never from here.
export const GateFaceComponent: FamilyPlugin["Component"] = ({ ctx, journeys, onCancel }) => {
  const { t } = useTranslation("common")
  const markers = ctx.gateFace?.markers ?? []
  return (
    <GateFacePanel
      title={t("gateFace.title")}
      hint={t(markers.length === 0 ? "gateFace.orderHint" : "gateFace.hint")}
      markers={markers.map(marker => {
        const name = t(`gateFace.owner.${marker.icon.kind === "key" ? "key" : marker.icon.family}`, {
          defaultValue: t("gateFace.owner.other"),
        })
        return {
          id: marker.id,
          icon: iconFor(marker.icon),
          lit: marker.lit,
          label: t(marker.lit ? "gateFace.lit" : "gateFace.unlit", { owner: name }),
        }
      })}
      orders={(ctx.gateFace?.sequences ?? []).map(sequence => {
        const spoiled = sequence.tiles.some(tile => tile.status === "outOfOrder")
        return {
          id: sequence.id,
          tiles: sequence.tiles.map((tile, step) => ({
            id: String(step),
            glyph: String.fromCodePoint(tile.glyph),
            status: tile.status,
            label: t(`gateFace.tile.${tile.status}`, { step: step + 1 }),
          })),
          ...(spoiled ? { note: t("gateFace.spoiled") } : {}),
          ...(sequence.reset
            ? {
                reset: {
                  label: t("gateFace.reset"),
                  onReset: () => journeys.setMechanismState(sequence.reset!.address, sequence.reset!.state),
                },
              }
            : {}),
        }
      })}
      turnAroundLabel={t("gate.turnAround")}
      onTurnAround={onCancel}
    />
  )
}
