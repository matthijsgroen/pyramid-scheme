import { useState } from "react"
import { PyramidExpedition } from "@/app/PyramidExpedition"
import { Base } from "@/app/Base"
import { useJourneys } from "@/app/state/useJourneys"
import { useCarveIndependentBackfill } from "@/app/SiteMap/useCarveIndependentBackfill"
import { useFloorExplorationBackfill } from "@/app/SiteMap/useFloorExplorationBackfill"
import { useMechanismSlotBackfill } from "@/app/SiteMap/useMechanismSlotBackfill"
import { useRelaidFloorsBackfill } from "@/app/SiteMap/useRelaidFloorsBackfill"
import { FezCompanion } from "./app/fez/FezCompanion"
import { DevelopModeProvider } from "./contexts/DevelopMode"
import PWABadge from "./PWABadge"
import { SaveUnreadableGuard } from "@/app/SaveUnreadableGuard"
import { useHomecoming } from "@/app/homecomingRegistry"
import { NewVersionNotice } from "@/app/NewVersionNotice"

function App({ newVersion = false }: { newVersion?: boolean }) {
  const [inGame, setInGame] = useState(false)
  // Held in memory only: a reload before it is dismissed simply goes straight to the camp.
  const [announcing, setAnnouncing] = useState(newVersion)
  // Set at the two ways home, never stored: a reload at base shows no coming-home screen.
  const [cameHome, setCameHome] = useState(false)
  const journeys = useJourneys()
  const comeHome = useHomecoming()
  const { activeJourneyId, getJourney, completeLevel, completeJourney } = journeys
  // One-time, and it must happen in the release BEFORE any floor is reshaped — see the hook.
  useCarveIndependentBackfill(journeys)
  // Also one-time: floor summaries a save kept from a visit it never finished light pyramids that
  // hold nothing, and the walk they provoke is the very thing they are meant to be deciding.
  useFloorExplorationBackfill(journeys)
  // After the two above, because it merges into what they have just written.
  useMechanismSlotBackfill(journeys)
  // Last, so a place the re-key derives for a save inside a re-laid pyramid is forgotten with the rest.
  useRelaidFloorsBackfill(journeys)

  const journeyInfo = activeJourneyId ? getJourney(activeJourneyId) : null

  const runNr = (journeyInfo?.completionCount ?? 0) + 1

  return (
    <DevelopModeProvider>
      <FezCompanion journeyProgress={getJourney}>
        {!inGame && (
          <Base
            startGame={() => setInGame(true)}
            cameHome={cameHome}
            greet={!announcing}
            onArrived={() => setCameHome(false)}
          />
        )}
        {inGame && journeyInfo && journeyInfo.journey && (
          <PyramidExpedition
            key={activeJourneyId}
            activeJourney={journeyInfo}
            runNr={runNr}
            onLevelComplete={completeLevel}
            onJourneyComplete={() => {
              completeJourney()
              comeHome()
              setCameHome(true)
              setInGame(false)
            }}
            onClose={() => {
              comeHome()
              setCameHome(true)
              setInGame(false)
            }}
          />
        )}
        {announcing && <NewVersionNotice onDismiss={() => setAnnouncing(false)} />}
        <PWABadge />
        <SaveUnreadableGuard />
      </FezCompanion>
    </DevelopModeProvider>
  )
}

export default App
