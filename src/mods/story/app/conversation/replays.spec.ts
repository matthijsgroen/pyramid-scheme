import { describe, expect, it } from "vitest"
import type { RoomCell } from "@/game/siteTypes"
import { FEZ_MET_IN } from "@/mods/story/game/conversation/sceneFor"
import { conversationReplaysAt } from "./replays"

const room = (state: RoomCell["state"], family = "conversation"): RoomCell => ({
  type: "room",
  roomType: "encounter",
  family,
  dirs: new Set(["w"]),
  state,
})

describe(conversationReplaysAt, () => {
  it("offers the meeting again once it has been heard", () => {
    expect(conversationReplaysAt(FEZ_MET_IN, { "meeting.starter_1": true })(room("completed"))).toBe(true)
  })

  it("offers nothing before the scene has been heard", () => {
    expect(conversationReplaysAt(FEZ_MET_IN, {})(room("completed"))).toBe(false)
  })

  it("offers nothing in a room not yet reached", () => {
    expect(conversationReplaysAt(FEZ_MET_IN, { "meeting.starter_1": true })(room("reachable"))).toBe(false)
  })

  it("leaves a ghost's room to its line", () => {
    expect(conversationReplaysAt("starter_treasure_tomb", { "tomb.starter": true })(room("completed"))).toBe(false)
  })

  it("offers nothing in a room of another family", () => {
    expect(conversationReplaysAt(FEZ_MET_IN, { "meeting.starter_1": true })(room("completed", "sumplete"))).toBe(false)
  })
})
