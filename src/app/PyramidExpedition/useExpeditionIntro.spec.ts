// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { useExpeditionIntro } from "./useExpeditionIntro"

type Shown = { id: string; story?: boolean }

const render = (over: { isTomb?: boolean; hasBlockedBlocks?: boolean } = {}) => {
  const shown: Shown[] = []
  const showConversation = vi.fn(
    (id: string, _onComplete?: unknown, options?: { story?: boolean }) => void shown.push({ id, story: options?.story })
  )
  renderHook(() => useExpeditionIntro({ isTomb: false, hasBlockedBlocks: false, ...over, showConversation }))
  return shown
}

describe("useExpeditionIntro", () => {
  it("teaches the board, which is the only thing this screen is about", () => {
    expect(render().map(s => s.id)).toEqual(["pyramidIntro"])
  })

  it("plays no beat about the place — that belongs to the journey, on the map", () => {
    // A journey holds several pyramids opened in free order, so a place beat fired here landed at
    // whichever one the player happened to enter first, over a board of numbered blocks.
    expect(
      render()
        .map(s => s.id)
        .filter(id => id.startsWith("arrival."))
    ).toEqual([])
  })

  it("leaves the board tutorial a tutorial, to go quiet with the rest of them", () => {
    expect(render().find(s => s.id === "pyramidIntro")?.story).toBeFalsy()
  })

  it("explains blocked blocks on a board that has them", () => {
    expect(render({ hasBlockedBlocks: true }).map(s => s.id)).toEqual(["pyramidIntro", "pyramidBlockedBlocks"])
  })

  it("teaches the tomb, in the order Fez should play it", () => {
    expect(render({ isTomb: true }).map(s => s.id)).toEqual(["tombIntro", "tombTutorial"])
  })

  it("says nothing about boards inside a tomb", () => {
    expect(render({ isTomb: true, hasBlockedBlocks: true }).map(s => s.id)).not.toContain("pyramidBlockedBlocks")
  })
})
