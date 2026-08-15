import { render, cleanup } from "@testing-library/react"
import { describe, expect, it, vi, afterEach } from "vitest"
import type { CombinedJourneyState } from "@/app/state/useJourneys"
import { FezContext } from "@/app/fez/context"

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

// The overlay and the popup are other components' business; stand them in so this spec is about
// which phase the sequence starts in.
vi.mock("./LevelCompletedOverlay", () => ({
  LevelCompletedOverlay: () => <div data-testid="level-completed-overlay" />,
}))
vi.mock("@/ui/atoms/LootPopup", () => ({
  LootPopup: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="loot-popup" /> : null),
}))

// Loot determination reaches into journeys and inventory; the phase logic only cares whether there
// is loot waiting, so it is supplied directly.
const loot = vi.fn<() => { loot: unknown; collectLoot: () => void }>(() => ({ loot: null, collectLoot: vi.fn() }))
vi.mock("./useLootDetermination", () => ({ useLootDetermination: () => loot() }))

const { LevelCompletionHandler } = await import("./LevelCompletionHandler")

const journey = { journeyId: "starter_1", levelNr: 1 } as unknown as CombinedJourneyState

const renderHandler = () =>
  render(
    <FezContext value={{ showConversation: vi.fn() }}>
      <LevelCompletionHandler onCompletionFinished={vi.fn()} activeJourney={journey} />
    </FezContext>
  )

afterEach(cleanup)

// Characterisation, not regression: these pass against the pre-refactor version too, because
// render() flushes effects inside act(), so the old start-hidden-then-advance-in-an-effect version
// had already reached the overlay phase by the time anything could be asserted. What they pin is the
// contract a later change could break — the overlay is up as soon as this mounts, and loot waits.
describe("LevelCompletionHandler", () => {
  it("shows the completion overlay on its first render", () => {
    const { queryByTestId } = renderHandler()
    expect(queryByTestId("level-completed-overlay")).not.toBeNull()
  })

  it("does not open the loot popup before the overlay phase has run its course", () => {
    loot.mockReturnValueOnce({ loot: { itemId: "money", itemName: "coins" }, collectLoot: vi.fn() })
    const { queryByTestId } = renderHandler()
    expect(queryByTestId("level-completed-overlay")).not.toBeNull()
    expect(queryByTestId("loot-popup")).toBeNull()
  })
})
