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

// A door that waits on several owners shows one marker per owner, lit as that owner stands. It only ever
// offers to turn around: reading changes no mechanism state and the door opens when its condition is met.
export const GateFaceComponent: FamilyPlugin["Component"] = ({ ctx, onCancel }) => {
  const { t } = useTranslation("common")
  const markers = ctx.gateFace?.markers ?? []
  return (
    <GateFacePanel
      title={t("gateFace.title")}
      hint={t("gateFace.hint")}
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
      turnAroundLabel={t("gate.turnAround")}
      onTurnAround={onCancel}
    />
  )
}
