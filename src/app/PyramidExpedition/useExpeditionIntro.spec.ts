// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { useExpeditionIntro } from "./useExpeditionIntro"

type Shown = { id: string; story?: boolean }

/** A companion that, like FezCompanion, plays a conversation once and drops it on every later offer. */
const companion = () => {
  const heard = new Set<string>()
  const shown: Shown[] = []
  const showConversation = vi.fn((id: string, _onComplete?: unknown, options?: { story?: boolean }) => {
    if (heard.has(id)) return
    heard.add(id)
    shown.push({ id, story: options?.story })
  })
  const visit = (over: { journeyId?: string; isTomb?: boolean; hasBlockedBlocks?: boolean } = {}) => {
    const before = shown.length
    renderHook(() =>
      useExpeditionIntro({ journeyId: "starter_1", isTomb: false, hasBlockedBlocks: false, ...over, showConversation })
    )
    return shown.slice(before)
  }
  return { visit }
}

const render = (over: { journeyId?: string; isTomb?: boolean; hasBlockedBlocks?: boolean } = {}) =>
  companion().visit(over)

describe("useExpeditionIntro", () => {
  it("tells the journey's place first, with its pyramid on screen, then teaches the board", () => {
    expect(render().map(s => s.id)).toEqual(["arrival.starter_1", "pyramidIntro"])
  })

  it("marks the place story, so turning tutorials off does not silence the plot", () => {
    expect(render().find(s => s.id === "arrival.starter_1")?.story).toBe(true)
  })

  it("does not tell the place again on a second visit to the same pyramid", () => {
    const { visit } = companion()
    visit()

    expect(visit().map(s => s.id)).toEqual([])
  })

  it("does not tell the place again at the journey's second pyramid", () => {
    const { visit } = companion()
    visit({ journeyId: "starter_1" })

    expect(visit({ journeyId: "starter_1", hasBlockedBlocks: true }).map(s => s.id)).toEqual(["pyramidBlockedBlocks"])
  })

  it("tells the next journey's place at that journey's first pyramid", () => {
    const { visit } = companion()
    visit({ journeyId: "starter_1" })

    expect(visit({ journeyId: "starter_2" }).map(s => s.id)).toEqual(["arrival.starter_2"])
  })

  it("only teaches the board on a journey with no beat of its own", () => {
    expect(render({ journeyId: "nothing_written_here" }).map(s => s.id)).toEqual(["pyramidIntro"])
  })

  it("leaves the board tutorial a tutorial, to go quiet with the rest of them", () => {
    expect(render().find(s => s.id === "pyramidIntro")?.story).toBeFalsy()
  })

  it("explains blocked blocks on a board that has them", () => {
    expect(render({ hasBlockedBlocks: true }).map(s => s.id)).toEqual([
      "arrival.starter_1",
      "pyramidIntro",
      "pyramidBlockedBlocks",
    ])
  })

  it("welcomes the tomb, and leaves the tableau's lesson to the tableau", () => {
    expect(render({ isTomb: true }).map(s => s.id)).toEqual(["tombIntro"])
  })

  it("says nothing about boards inside a tomb", () => {
    expect(render({ isTomb: true, hasBlockedBlocks: true }).map(s => s.id)).not.toContain("pyramidBlockedBlocks")
  })
})
