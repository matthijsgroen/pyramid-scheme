// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useExpeditionIntro } from "./useExpeditionIntro"

const withBeat = new Set<string>()

vi.mock("@/app/fez/arrivalConversation", () => ({
  arrivalConversationId: (journeyId: string) => (withBeat.has(journeyId) ? `arrival.${journeyId}` : "pyramidIntro"),
}))

type Shown = { id: string; story?: boolean }

const render = (over: { journeyId?: string; isTomb?: boolean; hasBlockedBlocks?: boolean } = {}) => {
  const shown: Shown[] = []
  const showConversation = vi.fn(
    (id: string, _onComplete?: unknown, options?: { story?: boolean }) => void shown.push({ id, story: options?.story })
  )
  renderHook(() =>
    useExpeditionIntro({ journeyId: "starter_1", isTomb: false, hasBlockedBlocks: false, ...over, showConversation })
  )
  return shown
}

describe("useExpeditionIntro", () => {
  beforeEach(() => withBeat.clear())

  it("greets the player at a pyramid with no beat of its own", () => {
    expect(render().map(s => s.id)).toEqual(["pyramidIntro"])
  })

  it("plays the journey's own arrival where one is written, and still teaches the board", () => {
    withBeat.add("starter_1")

    // Both, in that order: a beat about the place, then the one conversation that explains the
    // arithmetic. Offered every visit; Fez plays the tutorial only the first time.
    expect(render().map(s => s.id)).toEqual(["arrival.starter_1", "pyramidIntro"])
  })

  it("never lets a written arrival stand in for the board tutorial", () => {
    // Every pyramid having a beat of its own once left pyramidIntro firing on the single journey
    // that had none — which was the last one in the game.
    for (const journeyId of ["starter_1", "junior_2", "wizard_4"]) {
      withBeat.add(journeyId)
      expect(render({ journeyId }).map(s => s.id)).toContain("pyramidIntro")
    }
  })

  it("marks a journey's arrival as story, so turning tutorials off does not silence it", () => {
    withBeat.add("starter_1")

    expect(render()[0].story).toBe(true)
  })

  it("leaves the shared intro a tutorial, to go quiet with the rest of them", () => {
    // Not marked story, however it is offered — that is what lets the tutorials toggle silence it.
    expect(render().find(s => s.id === "pyramidIntro")?.story).toBeFalsy()
  })

  it("greets each journey with its own beat", () => {
    withBeat.add("junior_3")

    expect(render({ journeyId: "junior_3" }).map(s => s.id)).toEqual(["arrival.junior_3", "pyramidIntro"])
  })

  it("explains blocked blocks on a board that has them", () => {
    expect(render({ hasBlockedBlocks: true }).map(s => s.id)).toEqual(["pyramidIntro", "pyramidBlockedBlocks"])
  })

  it("teaches the tomb, in the order Fez should play it", () => {
    expect(render({ isTomb: true }).map(s => s.id)).toEqual(["tombIntro", "tombTutorial"])
  })

  it("says nothing about pyramids inside a tomb", () => {
    withBeat.add("starter_1")
    const ids = render({ isTomb: true, hasBlockedBlocks: true }).map(s => s.id)

    expect(ids).not.toContain("arrival.starter_1")
    expect(ids).not.toContain("pyramidBlockedBlocks")
  })
})
