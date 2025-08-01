import type { FC } from "react"
import { Page } from "../../ui/Page"

export const TravelPage: FC<{ startGame: () => void }> = ({ startGame }) => {
  return (
    <Page
      className="flex flex-col items-center justify-center bg-gradient-to-b from-blue-100 to-blue-300"
      snap="start"
    >
      <h1 className="text-2xl font-bold">Travel</h1>
      <p className="mt-2 text-center">
        Explore the world with our travel options.
      </p>
      <button
        className="mt-4 rounded bg-green-500 px-4 py-2 text-white"
        onClick={startGame}
      >
        Start Journey
      </button>
    </Page>
  )
}
