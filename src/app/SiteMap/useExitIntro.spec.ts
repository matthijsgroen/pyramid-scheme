// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { registerReactionContribution, type Reaction } from "@/app/reactions/reactionContributions"
import { EXIT_INTRO, useExitIntro } from "./useExitIntro"
import type { ArrivalPromptKind } from "./useSiteNavigation"

const reactions: Reaction[] = []
registerReactionContribution(() => reaction => reactions.push(reaction))
const site = { journeyId: "made-up", levelNr: 2, exterior: "cavern" }

const asked = (kinds: (ArrivalPromptKind | undefined)[]) => {
  const showConversation = vi.fn()
  const { rerender } = renderHook(({ kind }) => useExitIntro(kind, showConversation, site), {
    initialProps: { kind: kinds[0] },
  })
  for (const kind of kinds.slice(1)) rerender({ kind })
  return showConversation.mock.calls.map(([id]) => id)
}

describe("useExitIntro", () => {
  it("explains the pillar in its own room, once the player stands there", () => {
    expect(asked([undefined, "exit"])).toEqual([EXIT_INTRO])
  })

  it("says nothing on any other arrival", () => {
    expect(asked([undefined, "room", "stairs", "obstacle", "plate"])).toEqual([])
  })

  describe("reporting the exit", () => {
    beforeEach(() => {
      reactions.length = 0
    })

    it("reports one exitReached with the level's exterior, however often it re-renders", () => {
      asked([undefined, "exit", "exit", "exit"])

      expect(reactions).toEqual([{ kind: "exitReached", ...site }])
    })

    it("reports again when the player steps off the exit and back", () => {
      asked(["exit", "room", "exit"])

      expect(reactions).toHaveLength(2)
    })

    it("reports nothing on any other arrival", () => {
      asked([undefined, "room", "stairs"])

      expect(reactions).toEqual([])
    })
  })
})
