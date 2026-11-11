import { describe, expect, it } from "vitest"
import type { RoomCell } from "@/game/siteTypes"
import { CONVERSATION_META } from "@/mods/story/game/conversation/meta"
import { FORMULA, formulaGift, formulaHint } from "@/mods/story/game/reading/formula"
import { conversationOpensAt } from "./arrivals"

const room = (state: RoomCell["state"], family = CONVERSATION_META.id, conversation = "x") =>
  ({
    type: "room",
    roomType: "encounter",
    dirs: new Set(),
    state,
    family,
    encounterArgs: { conversation },
  }) as RoomCell

describe(conversationOpensAt, () => {
  it("opens a room whose scene is unheard on arrival, though the room reads finished", () => {
    expect(conversationOpensAt("made_up", {})(room("completed"))).toBe(true)
  })

  it("leaves a room whose scene has been heard to its prompt", () => {
    expect(conversationOpensAt("made_up", { x: true })(room("completed"))).toBe(false)
  })

  it.each(FORMULA.map(row => [row.giver, row]))("opens a heard room whose ghost owes a gift (%s)", (_, row) => {
    const seen = { [row.giver]: true, [formulaHint(row)]: true }

    expect(conversationOpensAt("made_up", seen)(room("completed", CONVERSATION_META.id, row.giver))).toBe(true)
    expect(
      conversationOpensAt("made_up", { ...seen, [formulaGift(row)]: true })(
        room("completed", CONVERSATION_META.id, row.giver)
      )
    ).toBe(false)
  })

  it("says nothing about a room of another family", () => {
    expect(conversationOpensAt("made_up", {})(room("completed", "puzzle"))).toBe(false)
  })
})
