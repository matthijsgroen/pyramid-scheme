// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook } from "@testing-library/react"
import { FezContext } from "@/app/fez/context"
import type { Reaction } from "@/app/reactions/reactionContributions"

vi.mock("@/mods/registeredMods", () => ({ isModEnabled: () => false }))

let heard: Record<string, boolean> = {}
vi.mock("@/support/useGameStorage", () => ({ latestGameValue: () => heard }))
vi.mock("@/mods/story/game/reaction/storyBeats", () => ({
  STORY_BEATS: new Set([
    "cave.t1",
    "camp.firstHome",
    "camp.rested",
    "bond.starter",
    "animal.throughDonkey",
    "animal.arrivesDonkey",
  ]),
}))

let held: ReadonlySet<string> = new Set()
vi.mock("@/app/SiteMap/keyProviders", () => ({ useMergedHeldKeys: () => held, useHeldKeysLoaded: () => true }))
vi.mock("@/app/pages/gateNeeds", () => ({
  useMergedGateNeeds: () => ({ needs: (gate: object) => ("journeyId" in gate ? [{ key: "purchase:donkey" }] : []) }),
}))

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
  beforeEach(() => {
    heard = {}
    held = new Set()
  })

  it("offers an animal's through beat on entering a journey whose gate needs a fact now held", () => {
    held = new Set(["purchase:donkey"])
    const { react, showConversation } = rail()

    react({ kind: "siteArrived", journeyId: "made-up-tomb", levelNr: 1 })

    expect(showConversation).toHaveBeenCalledWith("animal.throughDonkey", undefined, { story: true })
  })

  it("offers an animal's beat only after the moment's other beats are heard", () => {
    held = new Set(["purchase:donkey"])
    heard = { "animal.throughDonkey": true }
    const { react, showConversation } = rail()

    react({ kind: "siteArrived", journeyId: "made-up-tomb", levelNr: 1 })

    expect(showConversation).not.toHaveBeenCalled()
  })

  it("offers an animal's arrival on the homecoming that carries its tag", () => {
    heard = { "camp.firstHome": true }
    const { react, showConversation } = rail()

    react({ kind: "homeShown", tags: ["camp.arrived:purchase:donkey"], arrived: { haul: true } })

    expect(showConversation).toHaveBeenCalledWith("animal.arrivesDonkey", undefined, { story: true })
  })

  it("offers the beat a move is worth, as story so the tutorials toggle cannot silence it", () => {
    const { react, showConversation } = rail()

    react({ kind: "solved", tags: ["puzzle"], unaided: true, tier: "starter", journeyId: "starter_1" })

    expect(showConversation).toHaveBeenCalledWith("bond.starter", undefined, { story: true })
  })

  it("stays quiet on a move that is worth nothing", () => {
    const { react, showConversation } = rail()

    react({ kind: "solved", tags: ["puzzle"], unaided: false, tier: "starter", journeyId: "starter_1" })
    react({ kind: "siteLeft", journeyId: "expert_2", lastLevel: false })

    expect(showConversation).not.toHaveBeenCalled()
  })

  it("never offers a replay, so a trigger that keeps happening still speaks once", () => {
    const { react, showConversation } = rail()

    react({ kind: "solved", tags: ["puzzle"], unaided: true, tier: "starter", journeyId: "starter_1" })

    // The companion skips a conversation already seen; asking for a forced replay would defeat it.
    expect(showConversation.mock.calls[0][2]).not.toHaveProperty("forceReplay")
  })

  const home: Reaction = { kind: "homeShown", tags: ["trap.mended"], arrived: { haul: false } }

  it("offers the first candidate not yet heard, as story", () => {
    heard = { "camp.firstHome": true }
    const { react, showConversation } = rail()

    react(home)

    expect(showConversation).toHaveBeenCalledTimes(1)
    expect(showConversation).toHaveBeenCalledWith("camp.rested", undefined, { story: true })
  })

  it("offers nothing once every candidate is heard", () => {
    heard = { "camp.firstHome": true, "camp.rested": true }
    const { react, showConversation } = rail()

    react(home)

    expect(showConversation).not.toHaveBeenCalled()
  })
})
