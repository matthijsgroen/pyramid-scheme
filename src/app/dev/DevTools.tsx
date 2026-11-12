import type { FC } from "react"
import { useTranslation } from "react-i18next"
import { DeveloperButton } from "@/ui/atoms/DeveloperButton"
import { DevPanel } from "@/ui/molecules/DevPanel"
import { useDevActions } from "@/app/dev/useDevActions"
import { PuzzleLab } from "@/app/dev/PuzzleLab"
import { SaveTransfer } from "@/app/dev/SaveTransfer"
import { START_LOCK, encodeLockHash } from "@/app/dev/lockEditorUrl"
import { START_ROOM, encodeRoomHash } from "@/app/dev/roomEditorUrl"
import { useJourneys } from "@/app/state/useJourneys"
import { useJourneyTranslations } from "@/app/translations/useJourneyTranslations"

// The playtesting tools: mounted only while the settings dialog is open in develop mode, so their hooks cost
// nothing the rest of the time.
export const DevTools: FC<{ startGame: () => void; onClose: () => void }> = ({ startGame, onClose }) => {
  const { t } = useTranslation("common")
  const { startJourney } = useJourneys()
  const journeyList = useJourneyTranslations()
  const devActions = useDevActions(startGame, onClose)
  const shopTombJourney = journeyList.find(j => j.id === "junior_treasure_tomb")
  return (
    <div className="mt-6 space-y-4 rounded-lg bg-stone-900 p-3">
      {shopTombJourney && (
        <div className="flex justify-center">
          <DeveloperButton
            onClick={async () => {
              await startJourney(shopTombJourney)
              startGame()
            }}
            label="Jump to Shop Tomb"
          />
        </div>
      )}
      <DevPanel title="Playtesting tools (every journey is pickable in develop mode)" actions={devActions} />
      <SaveTransfer />
      <div className="flex justify-center gap-2">
        <DeveloperButton
          onClick={() => (window.location.hash = encodeLockHash(START_LOCK))}
          label={t("devLockEditor.open")}
        />
        <DeveloperButton
          onClick={() => (window.location.hash = encodeRoomHash(START_ROOM))}
          label={t("devRoomEditor.open")}
        />
      </div>
      <PuzzleLab />
    </div>
  )
}
