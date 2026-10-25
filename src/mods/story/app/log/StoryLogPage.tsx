import type { FC } from "react"
import { Page } from "@/ui/atoms/Page"
import { StoryLogSection } from "./StoryLogSection"

// The log as its own screen, until the Collection carries it.
export const StoryLogPage: FC = () => (
  <Page className="flex flex-col gap-3 overflow-y-auto bg-gradient-to-b from-amber-100 to-amber-200 p-4" snap="end">
    <StoryLogSection />
  </Page>
)
