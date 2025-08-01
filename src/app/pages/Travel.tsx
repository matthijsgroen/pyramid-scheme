import { useState, type FC } from "react"
import { Page } from "../../ui/Page"
import { MapButton } from "../../ui/MapButton"
import { JourneyCard } from "../../ui/JourneyCard"
import { journeys, type Journey } from "../../data/journeys"

export const TravelPage: FC<{ startGame: () => void }> = ({ startGame }) => {
  const [journeyProgress] = useState(0.1)
  const [prestige] = useState(0)
  const [inJourney] = useState(false)
  const [showJourneySelection, setShowJourneySelection] = useState(false)
  const [selectedJourney, setSelectedJourney] = useState<Journey | null>(null)
  // This could be passed as a prop or come from game state

  const handleMapClick = () => {
    if (selectedJourney) {
      startGame()
    } else {
      setShowJourneySelection(true)
    }
  }

  const handleJourneySelect = (journey: Journey) => {
    // Here you would navigate to the selected journey
    setShowJourneySelection(false)
    setSelectedJourney(journey)
    // startGame() // For now, just start the game
  }

  const handleBackToMap = () => {
    setShowJourneySelection(false)
  }

  return (
    <Page
      className="flex flex-col items-center justify-center bg-gradient-to-b from-blue-100 to-blue-300"
      snap="start"
    >
      <div className="flex w-full flex-1 flex-col overflow-y-auto py-6 md:px-16">
        <h1 className="mb-6 text-center font-pyramid text-2xl font-bold">
          Travel
        </h1>

        <div className="relative flex flex-1 flex-col gap-6 overflow-hidden lg:flex-row">
          {/* Map Section */}
          <div
            className={`absolute inset-0 flex w-full flex-col items-center px-8 transition-all duration-700 ease-in-out ${
              showJourneySelection
                ? "translate-x-[-100%] opacity-0"
                : "translate-x-0 opacity-100"
            }`}
          >
            <div className="w-full max-w-md">
              {selectedJourney && (
                <>
                  <h3 className="mb-4 text-center font-pyramid text-xl">
                    {selectedJourney.name}
                  </h3>
                  <p className="mb-4 max-w-md">{selectedJourney.description}</p>
                  <p className="mb-4 max-w-md">
                    Length: {selectedJourney.journeyLength}
                  </p>
                </>
              )}
              {!selectedJourney && (
                <p className="mb-4 text-center">
                  Start your adventure by exploring pyramids.
                </p>
              )}
              <MapButton
                onClick={handleMapClick}
                inJourney={inJourney}
                label={
                  inJourney
                    ? "Continue Journey"
                    : selectedJourney
                      ? "Start Journey"
                      : "Plan Journey"
                }
                journeyProgress={journeyProgress}
              />
              {!inJourney && selectedJourney && (
                <div className="mt-4 text-center text-sm">
                  Or{" "}
                  <button
                    onClick={() => {
                      setSelectedJourney(null)
                      setShowJourneySelection(true)
                    }}
                    className="mt-4 cursor-pointer bg-transparent py-2 font-bold text-blue-600 hover:text-blue-700"
                  >
                    select another journey
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Journey Selection Section */}
          <div
            className={`absolute inset-0 flex w-full flex-col transition-all duration-700 ease-in-out ${
              showJourneySelection
                ? "translate-x-0 opacity-100"
                : "translate-x-[100%] opacity-0"
            }`}
          >
            <div className="mb-4 flex w-full items-center justify-between px-8">
              <h2 className="font-pyramid text-xl font-bold">
                Choose Your Journey
              </h2>
              <button
                onClick={handleBackToMap}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1 text-sm font-bold text-white transition-colors hover:bg-blue-700"
              >
                ← Back to Map
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {journeys.map((journey, index) => (
                  <JourneyCard
                    key={journey.id}
                    journey={journey}
                    disabled={prestige < journey.requiredPrestigeLevel}
                    index={index}
                    showAnimation={showJourneySelection}
                    onClick={handleJourneySelect}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Page>
  )
}
