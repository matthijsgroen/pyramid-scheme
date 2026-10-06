// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { renderHook } from "@testing-library/react"
import { FezContext } from "@/app/fez/context"
import type { Reaction } from "@/app/reactions/reactionContributions"

vi.mock("@/mods/registeredMods", () => ({ isModEnabled: () => false }))

const { useStoryReactions } = await import("./rail")

const rail = () => {
  const showConversation = vi.fn()
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <FezContext value={{ showConversation } as unknown as React.ContextType<typeof FezContext>}>{children}</FezContext>
  )
  const { result } = renderHook(() => useStoryReactions(), { wrapper })
  return { react: (r: Reaction) => result.current(r), showConversation }
}

describe("the reaction rail", () => {
  it("offers the beat a move is worth, as story so the tutorials toggle cannot silence it", () => {
    const { react, showConversation } = rail()

    react({ kind: "solved", tags: ["puzzle"], unaided: true, tier: "starter", journeyId: "starter_1" })

    expect(showConversation).toHaveBeenCalledWith("bond.starter", undefined, { story: true })
  })

  it("stays quiet on a move that is worth nothing", () => {
    const { react, showConversation } = rail()

    react({ kind: "solved", tags: ["puzzle"], unaided: false, tier: "starter", journeyId: "starter_1" })
    react({ kind: "siteLeft", journeyId: "expert_2" })

    expect(showConversation).not.toHaveBeenCalled()
  })

  it("never offers a replay, so a trigger that keeps happening still speaks once", () => {
    const { react, showConversation } = rail()

    react({ kind: "solved", tags: ["puzzle"], unaided: true, tier: "starter", journeyId: "starter_1" })

    // The companion skips a conversation already seen; asking for a forced replay would defeat it.
    expect(showConversation.mock.calls[0][2]).not.toHaveProperty("forceReplay")
  })
})
