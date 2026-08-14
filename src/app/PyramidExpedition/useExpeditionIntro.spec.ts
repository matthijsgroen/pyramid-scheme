import { renderHook, act } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { clearGameData } from "@/support/useGameStorage"
import { useExpeditionIntro } from "./useExpeditionIntro"

const settle = () => act(async () => void (await Promise.resolve()))

const render = (over: { isTomb?: boolean; hasBlockedBlocks?: boolean } = {}) => {
  const shown: string[] = []
  const showConversation = vi.fn((id: string, onComplete?: (result: never) => void) => {
    shown.push(id)
    // The real Fez runs the conversation and then calls back; here it finishes at once.
    onComplete?.(undefined as never)
  })
  const hook = renderHook(() =>
    useExpeditionIntro({ isTomb: false, hasBlockedBlocks: false, ...over, showConversation })
  )
  return { hook, shown }
}

describe("useExpeditionIntro", () => {
  beforeEach(async () => {
    await clearGameData()
  })

  it("greets the player at a pyramid", async () => {
    const { shown } = render()
    await settle()

    expect(shown).toEqual(["pyramidIntro"])
  })

  it("explains blocked blocks on a board that has them", async () => {
    const { shown } = render({ hasBlockedBlocks: true })
    await settle()

    expect(shown).toEqual(["pyramidIntro", "pyramidBlockedBlocks"])
  })

  it("teaches the tomb on the player's first one", async () => {
    const { shown } = render({ isTomb: true })
    await settle()

    expect(shown).toEqual(["tombIntro", "tombTutorial"])
  })

  it("doesn't restart the intro when the tutorial flag is stored mid-conversation", async () => {
    // The flag is read from a ref taken at mount, so writing it while Fez is still talking can't
    // re-run the effect and cut him off. Whether a conversation the player has already seen is shown
    // again at all is Fez's own call (shouldSkipConversation).
    const { shown } = render({ isTomb: true })
    await settle()
    await settle()

    expect(shown).toEqual(["tombIntro", "tombTutorial"])
  })
})
