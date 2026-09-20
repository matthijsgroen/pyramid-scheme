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

  it("plays the journey's own arrival where one is written", () => {
    withBeat.add("starter_1")

    expect(render().map(s => s.id)).toEqual(["arrival.starter_1"])
  })

  it("marks a journey's arrival as story, so turning tutorials off does not silence it", () => {
    withBeat.add("starter_1")

    expect(render()[0].story).toBe(true)
  })

  it("leaves the shared intro a tutorial, to go quiet with the rest of them", () => {
    expect(render()[0].story).toBe(false)
  })

  it("greets each journey with its own beat", () => {
    withBeat.add("junior_3")

    expect(render({ journeyId: "junior_3" }).map(s => s.id)).toEqual(["arrival.junior_3"])
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
