// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const completeJourney = vi.fn()
const homecoming = vi.fn()

vi.mock("@/app/state/useJourneys", () => ({
  useJourneys: () => ({
    activeJourneyId: "made-up",
    getJourney: () => ({ journey: {}, completionCount: 0 }),
    completeLevel: () => {},
    completeJourney,
  }),
}))
vi.mock("@/app/homecomingRegistry", () => ({ useHomecoming: () => homecoming }))
vi.mock("@/app/SiteMap/useCarveIndependentBackfill", () => ({ useCarveIndependentBackfill: () => {} }))
vi.mock("@/app/SiteMap/useFloorExplorationBackfill", () => ({ useFloorExplorationBackfill: () => {} }))
vi.mock("@/app/SiteMap/useMechanismSlotBackfill", () => ({ useMechanismSlotBackfill: () => {} }))
vi.mock("@/app/SiteMap/useRelaidFloorsBackfill", () => ({ useRelaidFloorsBackfill: () => {} }))
vi.mock("./app/fez/FezCompanion", () => ({ FezCompanion: ({ children }: { children: unknown }) => children }))
vi.mock("./PWABadge", () => ({ default: () => null }))
vi.mock("@/app/Base", () => ({
  Base: ({ startGame, cameHome, onArrived }: { startGame: () => void; cameHome: boolean; onArrived: () => void }) => (
    <div>
      {cameHome && <button onClick={onArrived}>arrived</button>}
      <button onClick={startGame}>set off</button>
    </div>
  ),
}))
vi.mock("@/app/PyramidExpedition", () => ({
  PyramidExpedition: ({ onJourneyComplete, onClose }: { onJourneyComplete: () => void; onClose: () => void }) => (
    <div>
      <button onClick={onJourneyComplete}>finish</button>
      <button onClick={onClose}>leave</button>
    </div>
  ),
}))

const { default: App } = await import("./App")

beforeEach(() => {
  completeJourney.mockReset()
  homecoming.mockReset()
})
afterEach(cleanup)

describe(App, () => {
  it.each(["finish", "leave"])("runs the homecoming once and lands on the coming-home screen when you %s", name => {
    render(<App />)
    expect(screen.queryByText("arrived")).toBeNull()

    fireEvent.click(screen.getByText("set off"))
    fireEvent.click(screen.getByText(name))

    expect(homecoming).toHaveBeenCalledOnce()
    expect(screen.getByText("arrived")).toBeTruthy()
    fireEvent.click(screen.getByText("arrived"))
    expect(screen.queryByText("arrived")).toBeNull()
    expect(homecoming).toHaveBeenCalledOnce()
  })

  it("completes the journey only when finishing, not when leaving", () => {
    render(<App />)
    fireEvent.click(screen.getByText("set off"))
    fireEvent.click(screen.getByText("leave"))
    expect(completeJourney).not.toHaveBeenCalled()
  })
})
