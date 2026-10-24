// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { CombinedJourneyState } from "../state/useJourneys"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
vi.mock("@/app/translations/useJourneyTranslations", () => ({
  useJourneyTranslation: (id: string) => ({ name: id }),
}))
vi.mock("../state/useJourneys", () => ({
  useJourneys: () => ({ getJourney: () => ({ completionCount: 0 }) }),
}))
vi.mock("@/app/pages/journeyContributions", () => ({
  useMergedJourneyContributions: () => ({ lock: () => ({ found: 1, required: 1 }) }),
}))

const { ExpeditionCompletionOverlay } = await import("./ExpeditionCompletionOverlay")
const { journeys } = await import("@/data/journeys")
const { FezContext } = await import("../fez/context")

const renderOverlay = (id: string) =>
  render(
    <FezContext value={{ showConversation: () => {} }}>
      <ExpeditionCompletionOverlay activeJourney={stateFor(id)} />
    </FezContext>
  )

const stateFor = (id: string) => ({ journey: journeys.find(j => j.id === id) }) as unknown as CombinedJourneyState

describe(ExpeditionCompletionOverlay, () => {
  it("announces the tier's tomb when a pyramid of that tier finishes", () => {
    renderOverlay("starter_1")

    expect(screen.getAllByText(/starter_treasure_tomb/).length).toBeGreaterThan(0)
  })

  it("does not announce a tomb as unlocked on its own completion screen", () => {
    renderOverlay("starter_treasure_tomb")

    expect(screen.queryByText(/ui.newTombUnlocked/)).toBeNull()
  })
})
