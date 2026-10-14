import { getFamilyPlugin } from "@/app/families/familyRegistry"
import type { GateOwnerIcon } from "@/game/gateFace"
import { KeyIcon } from "@/ui/atoms/KeyIcon"
import { sharedTileUrl } from "./tileAssets"
import { CELL, PROP_H } from "./mapScale"

/** An owner of a door as its face draws it: a mechanism wears its family's icon, a key a key, a plate the floor's own
 * painting of it, with a stone where the door wants one. Every plate alike: the face never tells one from another. */
export const gateOwnerIcon = (icon: GateOwnerIcon) => {
  if (icon.kind === "key") return <KeyIcon color={icon.color ?? "blue"} size={40} />
  if (icon.kind === "plate") {
    const src = sharedTileUrl(icon.wants === "stone" ? "plateStone" : "plate")
    return src ? <img src={src} width={40} height={(40 * PROP_H) / CELL} alt="" /> : <span aria-hidden="true">▭</span>
  }
  return <span aria-hidden="true">{getFamilyPlugin(icon.family)?.meta.icon ?? "◇"}</span>
}

/** The name a marker is read out by, under gateFace.owner. */
export const gateOwnerName = (icon: GateOwnerIcon): string =>
  icon.kind === "key"
    ? "key"
    : icon.kind === "plate"
      ? icon.wants === "stone"
        ? "plateStone"
        : "plateEmpty"
      : icon.family
