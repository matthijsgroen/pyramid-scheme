// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { CombinedJourneyState } from "../state/useJourneys"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
vi.mock("@/app/translations/useJourneyTranslations", () => ({
  useJourneyTranslation: (id: string) => ({ name: id }),
}))
vi.mock("@/data/journeys", () => ({
  journeys: [
    { id: "pyramid-a", exterior: "pyramid", difficulty: "tier-x" },
    { id: "tomb-a", exterior: "tomb", difficulty: "tier-x" },
  ],
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

const renderOverlay = (id: string, onJourneyComplete?: () => void) =>
  render(
    <FezContext value={{ showConversation: () => {} }}>
      <ExpeditionCompletionOverlay activeJourney={stateFor(id)} onJourneyComplete={onJourneyComplete} />
    </FezContext>
  )

const stateFor = (id: string) => ({ journey: journeys.find(j => j.id === id) }) as unknown as CombinedJourneyState

describe(ExpeditionCompletionOverlay, () => {
  it("announces the tier's tomb when a pyramid of that tier finishes", () => {
    renderOverlay("pyramid-a")

    expect(screen.getAllByText(/tomb-a/).length).toBeGreaterThan(0)
  })

  it("does not announce a tomb as unlocked on its own completion screen", () => {
    renderOverlay("tomb-a")

    expect(screen.queryByText(/ui.newTombUnlocked/)).toBeNull()
  })

  it("announces what opened but offers one button, which goes back to camp", () => {
    const onJourneyComplete = vi.fn()
    renderOverlay("pyramid-a", onJourneyComplete)

    expect(screen.getAllByRole("button")).toHaveLength(1)
    fireEvent.click(screen.getByRole("button", { name: "ui.goBackToBase" }))
    expect(onJourneyComplete).toHaveBeenCalledOnce()
  })
})
