import { useState } from "react"
import { JourneySelection } from "./JourneySelection"
import { BaseHeader } from "../components/BaseHeader"
import { TravelPage } from "./pages/Travel"
import { WorkshopPage } from "./pages/Workshop"
import { CollectionPage } from "./pages/Collection"

export const Base = ({ startGame }: { startGame: () => void }) => {
  return (
    <div className="flex h-dvh w-full flex-col items-center justify-between overflow-y-auto ">
      <div className="w-full shrink-0 grid-flow-dense auto-rows-min grid-cols-1">
        <BaseHeader />
      </div>
      <div className="flex w-full flex-1 snap-x snap-mandatory flex-row overflow-x-scroll overscroll-contain">
        <TravelPage startGame={startGame} />
        <WorkshopPage />
        <CollectionPage />
      </div>
    </div>
  )
}
