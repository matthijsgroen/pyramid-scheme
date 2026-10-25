// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook } from "@testing-library/react"
import { FezContext } from "@/app/fez/context"

let held: ReadonlySet<string> = new Set()
let loaded = true
vi.mock("@/app/SiteMap/keyProviders", () => ({ useMergedHeldKeys: () => held, useHeldKeysLoaded: () => loaded }))

let heard: Record<string, boolean> = {}
vi.mock("@/support/useGameStorage", () => ({ latestGameValue: () => heard }))
vi.mock("@/mods/story/game/reaction/storyBeats", () => ({
  STORY_BEATS: new Set(["animal.boughtDonkey", "animal.boughtCart"]),
}))

const { useAnimalPurchaseBeats } = await import("./animalPurchases")

const mount = () => {
  const showConversation = vi.fn()
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <FezContext value={{ showConversation } as unknown as React.ContextType<typeof FezContext>}>{children}</FezContext>
  )
  const view = renderHook(() => useAnimalPurchaseBeats(), { wrapper })
  return { ...view, showConversation }
}

describe("Fez on a purchase being bought", () => {
  beforeEach(() => {
    held = new Set()
    loaded = true
    heard = {}
  })

  it("says nothing for facts already held when the keys are first read", () => {
    held = new Set(["purchase:donkey"])
    const { showConversation } = mount()
    expect(showConversation).not.toHaveBeenCalled()
  })

  it("says the beat as story when the fact joins the held keys", () => {
    const { rerender, showConversation } = mount()
    held = new Set(["purchase:cart"])
    rerender()
    expect(showConversation).toHaveBeenCalledTimes(1)
    expect(showConversation).toHaveBeenCalledWith("animal.boughtCart", undefined, { story: true })
  })

  it("says it once, even when two components mount the hook and see the same purchase", () => {
    const first = mount()
    const second = mount()
    held = new Set(["purchase:donkey"])
    first.rerender()
    second.rerender()
    expect(first.showConversation.mock.calls.length + second.showConversation.mock.calls.length).toBe(1)
  })

  it("says nothing for a beat already heard, or one the story does not declare", () => {
    heard = { "animal.boughtCart": true }
    const { rerender, showConversation } = mount()
    held = new Set(["purchase:cart", "purchase:camel", "made-up-fact"])
    rerender()
    expect(showConversation).not.toHaveBeenCalled()
  })

  it("waits for the held keys to be read before it counts what is new", () => {
    loaded = false
    const { rerender, showConversation } = mount()
    held = new Set(["purchase:donkey"])
    loaded = true
    rerender()
    expect(showConversation).not.toHaveBeenCalled()
  })
})
