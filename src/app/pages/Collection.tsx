import type { FC } from "react"
import { Page } from "../../ui/Page"

export const CollectionPage: FC = () => {
  return (
    <Page
      className="flex flex-col items-center justify-center bg-gradient-to-b from-purple-100 to-purple-300"
      snap="end"
    >
      <h1 className="text-2xl font-bold">Collection</h1>
      <p className="mt-2 text-center">
        View and manage your collected treasures and artifacts.
      </p>
    </Page>
  )
}
