import { BaseHeader } from "@/components/BaseHeader"
import { TravelPage } from "@/app/pages/Travel"
import { CollectionPage } from "@/app/pages/Collection"
import { use, useEffect } from "react"
import { FezContext } from "./fez/context"
import type { Difficulty } from "@/data/difficultyLevels"

export const Base = ({
  startGame,
  pendingHieroglyphSearch,
}: {
  startGame: () => void
  pendingHieroglyphSearch?: Difficulty | null
}) => {
  const { showConversation } = use(FezContext)

  useEffect(() => {
    showConversation("welcome")
  }, [showConversation])

  return (
    <div className="flex h-dvh w-full flex-col items-center justify-between overflow-y-auto ">
      <div className="w-full shrink-0 grid-flow-dense auto-rows-min grid-cols-1">
        <BaseHeader />
      </div>
      <div className="flex w-full flex-1 snap-x snap-mandatory flex-row justify-around overflow-x-scroll overscroll-contain bg-gradient-to-b from-blue-100 to-blue-300">
        <TravelPage startGame={startGame} pendingHieroglyphSearch={pendingHieroglyphSearch} />
        <CollectionPage />
      </div>
    </div>
  )
}
