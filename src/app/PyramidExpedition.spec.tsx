import { render, act } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { PyramidExpedition } from "./PyramidExpedition"
import { FezContext } from "./fez/context"
import type { CombinedJourneyState } from "@/app/state/useJourneys"
import type { TranslatedJourney } from "@/app/translations/useJourneyTranslations"
import { journeys as allJourneys } from "@/data/journeys"
import { clearGameData } from "@/support/useGameStorage"

// Isolated from the app's real i18n setup (never initialized in tests) — the keys are enough to
// tell the screens apart, and none of these assertions read copy.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

// Long enough that levels 1–3 all exist — past `levelCount` the screen shows the completion
// overlay instead of a board.
const journeyData = allJourneys.find(j => j.type === "pyramid" && j.levelCount >= 4)!

const makeActiveJourney = (levelNr: number): CombinedJourneyState => ({
  journeyId: journeyData.id,
  levelNr,
  completionCount: 1,
  active: true,
  exploredSections: {},
  position: null,
  // null, so the screen shows the exterior board rather than restoring the interior
  interiorLevelNr: null,
  inProgress: true,
  randomSeed: 12345,
  progressPercentage: 0,
  journey: { ...journeyData, name: journeyData.id, description: "", lengthLabel: "short" } as TranslatedJourney,
})

const screenAt = (levelNr: number) => (
  <FezContext.Provider value={{ showConversation: () => {} }}>
    <PyramidExpedition activeJourney={makeActiveJourney(levelNr)} runNr={1} />
  </FezContext.Provider>
)

// Storage reads resolve on their own microtasks; settle them while the tree is still mounted so
// no React work is scheduled after the environment tears down.
const settle = async () => {
  await act(async () => {
    await Promise.resolve()
  })
}

const renderAt = async (levelNr: number) => {
  const result = render(screenAt(levelNr))
  await settle()
  return result
}

// The playable board is the only focusable one (the decorative neighbours are inert), so its
// layer is the one wrapping the focusable container.
const playableLayer = (container: HTMLElement) =>
  container.querySelector('[tabindex="0"]')?.closest<HTMLElement>("div.absolute.inset-0") ?? null

// The "thrown off-screen, next level incoming" transform, applied both declaratively and by the
// parallax scroll handler.
const isThrownOffScreen = (el: HTMLElement) => el.style.transform.includes("translateX(-200%)")

describe("PyramidExpedition — revisiting an earlier pyramid", () => {
  beforeEach(async () => {
    await clearGameData()
  })

  it("keeps the playable board on screen when the level moves down after mount", async () => {
    // The revisit race: Travel writes the picked level to storage while App still renders the
    // level the player is leaving, so the expedition mounts at the old, higher level and only
    // then sees the lower one. The forward-transition animation must not latch on.
    const { container, rerender } = await renderAt(3)
    expect(isThrownOffScreen(playableLayer(container)!)).toBe(false)

    await act(async () => {
      rerender(screenAt(1))
    })
    await settle()

    const playable = playableLayer(container)
    expect(playable).not.toBeNull()
    expect(isThrownOffScreen(playable!)).toBe(false)
  })

  it("puts the revisited level's own board on screen, not the neighbouring one", async () => {
    // With the animation latched the board centred on screen is the inert decorative neighbour:
    // it looks like a pyramid but has no `onAnswer`, so nothing the player taps does anything.
    const { container, rerender } = await renderAt(3)
    await act(async () => {
      rerender(screenAt(1))
    })
    await settle()

    // translateX(0) is the centre slot; only the playable board may occupy it.
    const inertLayers = [...container.querySelectorAll<HTMLElement>("div.absolute.inset-0[inert]")]
    expect(inertLayers).toHaveLength(2)
    expect(inertLayers.some(el => el.style.transform.includes("translateX(0)"))).toBe(false)
  })

  it("re-seeds rather than animating when the level changes without a transition", async () => {
    // Guard against over-correcting: the forward animation is driven by the transition timers,
    // so an unprompted level bump must simply re-seed at the new level.
    const { container, rerender } = await renderAt(1)
    await act(async () => {
      rerender(screenAt(2))
    })
    await settle()
    expect(isThrownOffScreen(playableLayer(container)!)).toBe(false)
  })
})

describe("PyramidExpedition — focus", () => {
  beforeEach(async () => {
    await clearGameData()
  })

  it("makes only the playable board focusable, so the decorative ones can't scroll it out of view", async () => {
    // Three boards mount at once inside one scroll container. Every focusable container in there
    // is somewhere the browser may scroll to when something takes focus.
    const { container } = await renderAt(1)

    expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(1)
    // …and the decorative layers are inert, so their inputs leave the tab order too.
    expect(container.querySelectorAll("div.absolute.inset-0[inert]")).toHaveLength(2)
  })
})
