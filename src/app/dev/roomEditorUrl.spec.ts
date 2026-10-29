import { describe, expect, it } from "vitest"
import { parsePrefab } from "@/game/prefabNotation"
import { prefabFaults } from "@/game/prefabChecks"
import { START_ROOM, decodeRoomHash, encodeRoomHash, initialRoomText } from "./roomEditorUrl"

describe("the room link", () => {
  it("reads back exactly the text it was made from, whatever characters it holds", () => {
    const text = "// designed by: ünï ✓ 100% #1 & more\nroom hall\n\n  tier starter"
    expect(decodeRoomHash(encodeRoomHash(text))).toBe(text)
  })

  it("keeps a newline and a hash sign out of the raw hash", () => {
    expect(encodeRoomHash("a\n#b").slice(1)).not.toMatch(/[\n#]/)
  })

  it("is null for a hash that is not a room link or is damaged", () => {
    expect(decodeRoomHash("")).toBeNull()
    expect(decodeRoomHash("#lock=1")).toBeNull()
    expect(decodeRoomHash("#room=%E0%A4%A")).toBeNull()
  })

  it("starts from the starting room when the link carries none", () => {
    expect(initialRoomText("")).toBe(START_ROOM)
    expect(initialRoomText(encodeRoomHash("x"))).toBe("x")
  })

  it("starts from a room that reads and passes the checks", () => {
    expect(prefabFaults(parsePrefab(START_ROOM))).toEqual([])
  })
})
