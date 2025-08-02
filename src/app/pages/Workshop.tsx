import type { FC } from "react"
import { Page } from "@/ui/Page"

export const WorkshopPage: FC = () => {
  return (
    <Page
      className="flex flex-col items-center justify-center bg-gradient-to-b from-amber-100 to-amber-300"
      snap="center"
    >
      <h1 className="text-2xl font-bold">Workshop</h1>
      <p className="mt-2 text-center">
        Craft and create items in your workshop.
      </p>
    </Page>
  )
}
