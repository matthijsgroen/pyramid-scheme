// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { registerReactionContribution, type Reaction } from "@/app/reactions/reactionContributions"
import { useExpeditionIntro } from "./useExpeditionIntro"

const reactions: Reaction[] = []
/** Offers and reports in the order they happened. */
const calls: string[] = []
registerReactionContribution(() => reaction => {
  reactions.push(reaction)
  calls.push(`report:${reaction.kind}`)
})

type Over = { journeyId?: string; isTomb?: boolean; hasBlockedBlocks?: boolean; levelNr?: number; exterior?: string }
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
  const visit = (over: Over = {}) => {
    const before = shown.length
    renderHook(() =>
      useExpeditionIntro({
        journeyId: "starter_1",
        isTomb: false,
        hasBlockedBlocks: false,
        levelNr: 1,
        ...over,
        showConversation,
      })
    )
    return shown.slice(before)
  }
  return { visit }
}

const render = (over: Over = {}) => companion().visit(over)

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

  describe("reporting the arrival", () => {
    beforeEach(() => {
      reactions.length = 0
    })

    it("reports one siteArrived with the level's exterior, and nothing more on a re-render", () => {
      const showConversation = vi.fn()
      const args = { journeyId: "made-up", isTomb: true, hasBlockedBlocks: false, levelNr: 1, exterior: "caveMouth" }
      const { rerender } = renderHook(p => useExpeditionIntro({ ...p, showConversation }), { initialProps: args })
      rerender({ ...args })
      rerender({ ...args, hasBlockedBlocks: true })

      expect(reactions).toEqual([{ kind: "siteArrived", journeyId: "made-up", levelNr: 1, exterior: "caveMouth" }])
    })

    it("reports the next level's own arrival", () => {
      const showConversation = vi.fn()
      const args = { journeyId: "made-up", isTomb: true, hasBlockedBlocks: false, levelNr: 1, exterior: "caveMouth" }
      const { rerender } = renderHook(p => useExpeditionIntro({ ...p, showConversation }), { initialProps: args })
      rerender({ ...args, levelNr: 2, exterior: "cavern" })

      expect(reactions.map(r => r.kind === "siteArrived" && [r.levelNr, r.exterior])).toEqual([
        [1, "caveMouth"],
        [2, "cavern"],
      ])
    })

    it("leaves the exterior absent for a plain pyramid", () => {
      render()

      expect(reactions).toEqual([{ kind: "siteArrived", journeyId: "starter_1", levelNr: 1, exterior: undefined }])
    })
  })

  it("offers the tomb's welcome before reporting the arrival", () => {
    calls.length = 0
    const showConversation = vi.fn((id: string) => {
      calls.push(`offer:${id}`)
    })
    renderHook(() =>
      useExpeditionIntro({
        journeyId: "made-up",
        isTomb: true,
        hasBlockedBlocks: false,
        levelNr: 1,
        exterior: "caveMouth",
        showConversation,
      })
    )

    expect(calls).toEqual(["offer:tombIntro", "report:siteArrived"])
  })
})
