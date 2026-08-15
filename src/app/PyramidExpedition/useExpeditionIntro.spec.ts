import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { useExpeditionIntro } from "./useExpeditionIntro"

const render = (over: { isTomb?: boolean; hasBlockedBlocks?: boolean } = {}) => {
  const shown: string[] = []
  const showConversation = vi.fn((id: string) => void shown.push(id))
  const hook = renderHook(() =>
    useExpeditionIntro({ isTomb: false, hasBlockedBlocks: false, ...over, showConversation })
  )
  return { hook, shown }
}

describe("useExpeditionIntro", () => {
  it("greets the player at a pyramid", () => {
    const { shown } = render()

    expect(shown).toEqual(["pyramidIntro"])
  })

  it("explains blocked blocks on a board that has them", () => {
    const { shown } = render({ hasBlockedBlocks: true })

    expect(shown).toEqual(["pyramidIntro", "pyramidBlockedBlocks"])
  })

  it("teaches the tomb, in the order Fez should play it", () => {
    const { shown } = render({ isTomb: true })

    expect(shown).toEqual(["tombIntro", "tombTutorial"])
  })

  it("says nothing about pyramids inside a tomb", () => {
    const { shown } = render({ isTomb: true, hasBlockedBlocks: true })

    expect(shown).not.toContain("pyramidIntro")
    expect(shown).not.toContain("pyramidBlockedBlocks")
  })
})
