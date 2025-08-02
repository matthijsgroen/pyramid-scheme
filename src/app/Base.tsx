import { BaseHeader } from "@/components/BaseHeader"
import { TravelPage } from "@/app/pages/Travel"
import { WorkshopPage } from "@/app/pages/Workshop"
import { CollectionPage } from "@/app/pages/Collection"
import { isBeta } from "@/config/constants"

export const Base = ({ startGame }: { startGame: () => void }) => {
  return (
    <div className="flex h-dvh w-full flex-col items-center justify-between overflow-y-auto ">
      <div className="w-full shrink-0 grid-flow-dense auto-rows-min grid-cols-1">
        <BaseHeader />
      </div>
      <div className="flex w-full flex-1 snap-x snap-mandatory flex-row justify-around overflow-x-scroll overscroll-contain bg-gradient-to-b from-blue-100 to-blue-300">
        <TravelPage startGame={startGame} />
        {isBeta && <WorkshopPage />}
        {isBeta && <CollectionPage />}
      </div>
    </div>
  )
}
