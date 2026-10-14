/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { useTranslation } from "react-i18next"
import { registerFamily, type FamilyContext, type FamilyPlugin } from "@/app/families/familyRegistry"
import { gateOwnerIcon, gateOwnerName } from "@/app/SiteMap/gateOwnerIcon"
import { MarkChip } from "@/app/SiteMap/mark"
import { generatePuzzle } from "@/game/seeds/generatePuzzle"
import { isModEnabled } from "@/mods/registeredMods"
import { PROCESSION_META } from "@/mods/puzzle/game/procession/meta"
import type { ProcessionPuzzle } from "@/mods/puzzle/game/procession/procession"
import { doorVariant } from "@/mods/puzzle/game/procession/processionConfig"
import { PROCESSION_DOOR_META } from "@/mods/puzzle/game/processionDoor/meta"
import { ProcessionDoor } from "./ProcessionDoor"
import { useDoorBoardStarts } from "./useDoorBoardStarts"

/** The sequence a procession door reads: the one on its face whose order is hidden. */
const hiddenOf = (ctx: FamilyContext) => ctx.gateFace?.sequences?.find(sequence => sequence.hidden)

/** The door's board: the procession family's, at the door's tier, one bar per step, dealt by the door's index. */
const generate = (seed: number, ctx: FamilyContext): ProcessionPuzzle =>
  generatePuzzle<ProcessionPuzzle>(PROCESSION_META, seed, {
    difficulty: ctx.difficulty,
    variant: doorVariant(hiddenOf(ctx)?.tiles.length ?? 0),
    boardIndex: ctx.boardIndex,
  })

const ProcessionDoorComponent: FamilyPlugin<ProcessionPuzzle>["Component"] = ({ puzzle, ctx, journeys, onCancel }) => {
  const { t } = useTranslation("common")
  const sequence = hiddenOf(ctx)
  const [saved, save] = useDoorBoardStarts(`${ctx.journeyId}|${ctx.levelNr}:${sequence?.hidden?.address}`, puzzle)
  if (!sequence?.hidden) return null
  const markers = (ctx.gateFace?.markers ?? []).map(marker => {
    const name = t(`gateFace.owner.${gateOwnerName(marker.icon)}`, { defaultValue: t("gateFace.owner.other") })
    return {
      id: marker.id,
      icon: gateOwnerIcon(marker.icon),
      lit: marker.lit,
      ...(marker.mark ? { badge: <MarkChip mark={marker.mark} size={22} /> } : {}),
      label: t(marker.lit ? "gateFace.lit" : "gateFace.unlit", { owner: name }),
    }
  })
  const { reset } = sequence
  return (
    <ProcessionDoor
      puzzle={puzzle}
      face={{ ...sequence, hidden: sequence.hidden }}
      markers={markers}
      savedStarts={saved}
      onStarts={save}
      onRead={() => journeys.readSequence(sequence.hidden!.address)}
      {...(reset ? { onReset: () => journeys.setMechanismState(reset.address, reset.state) } : {})}
      onTurnAround={onCancel}
    />
  )
}

// Registered with the puzzle mod, which owns the procession board; without it the door's sequence is unrealised.
if (isModEnabled("puzzle")) registerFamily({ meta: PROCESSION_DOOR_META, generate, Component: ProcessionDoorComponent })
