// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { renderHook } from "@testing-library/react"
import { FezContext } from "@/app/fez/context"
import { useMergedReactions } from "@/app/reactions/reactionContributions"

/**
 * The link no unit test reaches: that the rail is actually PLUGGED IN.
 *
 * `beatFor` can be right and the rail can offer the beat correctly while the story mod's app
 * entrypoint never imports the file that registers it — in which case core reports every move
 * into an empty registry, nothing fires, and nothing fails. So this imports the entrypoint the way
 * the app does and asks core, not the rail, whether a move reaches Fez.
 */
import "@/mods/story/app"

describe("the story mod, as the app loads it", () => {
  it("has a listener on core's reactions, so a move can reach Fez at all", () => {
    const showConversation = vi.fn()
    const { result } = renderHook(() => useMergedReactions(), {
      wrapper: ({ children }) => (
        <FezContext value={{ showConversation } as unknown as React.ContextType<typeof FezContext>}>
          {children}
        </FezContext>
      ),
    })

    result.current({ kind: "siteLeft", journeyId: "starter_treasure_tomb" })

    expect(showConversation).toHaveBeenCalledWith("bond.starterTomb", undefined, { story: true })
  })
})
