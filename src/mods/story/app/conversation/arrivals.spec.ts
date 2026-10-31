import { describe, expect, it } from "vitest"
import type { RoomCell } from "@/game/siteTypes"
import { CONVERSATION_META } from "@/mods/story/game/conversation/meta"
import { conversationOpensAt } from "./arrivals"

const room = (state: RoomCell["state"], family = CONVERSATION_META.id) =>
  ({
    type: "room",
    roomType: "encounter",
    dirs: new Set(),
    state,
    family,
    encounterArgs: { conversation: "x" },
  }) as RoomCell

describe(conversationOpensAt, () => {
  it("opens a room whose scene is unheard on arrival, though the room reads finished", () => {
    expect(conversationOpensAt("made_up", {})(room("completed"))).toBe(true)
  })

  it("leaves a room whose scene has been heard to its prompt", () => {
    expect(conversationOpensAt("made_up", { x: true })(room("completed"))).toBe(false)
  })

  it("says nothing about a room of another family", () => {
    expect(conversationOpensAt("made_up", {})(room("completed", "puzzle"))).toBe(false)
  })
})
