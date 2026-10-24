// @vitest-environment jsdom
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

// The interior is its own screen; these tests only need a way to finish it.
vi.mock("@/app/SiteMap/SiteMapScreen", () => ({
  SiteMapScreen: ({ onSiteComplete }: { onSiteComplete: () => void }) => (
    <button onClick={onSiteComplete}>finish interior</button>
  ),
}))

// Long enough that levels 1–3 all exist — past `levelCount` the screen shows the completion
// overlay instead of a board.
const journeyData = allJourneys.find(j => j.exterior === "pyramid" && j.levelCount >= 4)!

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

describe("PyramidExpedition — leaving a reopened interior", () => {
  beforeEach(async () => {
    await clearGameData()
  })

  const interiorJourney = allJourneys.find(
    j => j.exterior === "pyramid" && (j.siteConfigs?.length ?? 0) > 0 && j.levelCount >= 3
  )!
  const reopenedInterior: CombinedJourneyState = {
    ...makeActiveJourney(1),
    journeyId: interiorJourney.id,
    completionCount: 0,
    interiorLevelNr: 1,
    journey: {
      ...interiorJourney,
      name: interiorJourney.id,
      description: "",
      lengthLabel: "short",
    } as TranslatedJourney,
  }

  it("slides the solved board away filled in, not emptied", async () => {
    const { container, getByText } = render(
      <FezContext.Provider value={{ showConversation: () => {} }}>
        <PyramidExpedition activeJourney={reopenedInterior} runNr={1} />
      </FezContext.Provider>
    )
    await settle()

    await act(async () => {
      getByText("finish interior").click()
      await new Promise(resolve => setTimeout(resolve, 400))
    })

    const outgoing = [...container.querySelectorAll<HTMLElement>("div.absolute.inset-0")].find(isThrownOffScreen)
    expect(outgoing).toBeDefined()
    const inputs = [...outgoing!.querySelectorAll("input")]
    expect(inputs.length).toBeGreaterThan(0)
    expect(inputs.filter(input => input.value === "")).toHaveLength(0)
  })
})

describe("PyramidExpedition — a level without a board", () => {
  beforeEach(async () => {
    await clearGameData()
  })

  const boardlessJourney: CombinedJourneyState = {
    ...makeActiveJourney(1),
    completionCount: 0,
    interiorLevelNr: null,
    journey: {
      ...journeyData,
      siteConfigs: allJourneys.find(j => (j.siteConfigs?.length ?? 0) > 0)!.siteConfigs,
      levels: [{ exterior: "caveMouth", board: false }],
      name: "cave",
      description: "",
      lengthLabel: "short",
    } as TranslatedJourney,
  }
  const screen = (state: CombinedJourneyState) => (
    <FezContext.Provider value={{ showConversation: () => {} }}>
      <PyramidExpedition activeJourney={state} runNr={1} />
    </FezContext.Provider>
  )

  it("shows the way in and no board, and the way in opens the interior", async () => {
    const { container, getByText, queryByText } = render(screen(boardlessJourney))
    await settle()

    expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(0)
    expect(queryByText("finish interior")).toBeNull()

    await act(async () => getByText("ui.enterSite").click())

    expect(queryByText("finish interior")).not.toBeNull()
  })

  it("stands the cave mouth on the desert where the board would be", async () => {
    const { container } = render(screen(boardlessJourney))
    await settle()

    expect(container.querySelector("[data-cave-mouth]")).not.toBeNull()
  })

  it("draws no board of its own and borrows none of the next level's as scenery", async () => {
    const { container } = render(screen(boardlessJourney))
    await settle()

    expect(container.querySelectorAll("[inert] *")).toHaveLength(0)
  })

  it("reopens the interior, not the way in, when the player comes back mid-visit", async () => {
    const { queryByText } = render(screen({ ...boardlessJourney, interiorLevelNr: 1 }))
    await settle()

    expect(queryByText("finish interior")).not.toBeNull()
    expect(queryByText("ui.enterSite")).toBeNull()
  })
})
