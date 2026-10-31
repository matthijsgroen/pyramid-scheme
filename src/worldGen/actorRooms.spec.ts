import { describe, expect, it } from "vitest"
import { parsePrefab } from "@/game/prefabNotation"
import type { ResolveEncounter } from "@/game/siteAssembler"
import type { FloorConfig, SiteConfig } from "./types"
import { refuseUnfitActorRooms } from "./actorRooms"
import { RoomFault } from "./dsl"

// Made-up families: "chat" has somebody in its room, "riddle" has nobody.
const resolve: ResolveEncounter = encounter => {
  const id = Array.isArray(encounter) ? encounter.join("+") : (encounter ?? "puzzle")
  return { familyId: id, tags: [], ...(id === "chat" ? { actor: true as const } : {}) }
}

const made = (name: string, rows: string[]) =>
  parsePrefab(`room ${name}\ntier junior\nlayout\n${rows.join("\n")}\ns stop`, name)
// North of the stop is bare and off every walk.
const nook = made("nook", ["# # # # #", "# . . . #", "d . . . d", "# . s . #", "# # d # #"])
// The north door walks through the cell north of the stop.
const passage = made("passage", ["# # d # #", "# . . . #", "# . s . #", "# # # # #"])

const floorWith = (fields: Partial<FloorConfig>): Record<string, SiteConfig[]> => ({
  made_up: [[{ sideSections: [], ...fields } as unknown as FloorConfig]],
})

describe("rooms pinned to somebody", () => {
  it("a pinned room on a node whose encounter has somebody must be fit, or the bake names both", () => {
    const pinned = (room: string, encounter: string) =>
      floorWith({
        prefabs: { nook, passage },
        prefabsByIndex: { 2: room },
        encountersByIndex: { 2: encounter },
      })
    expect(() => refuseUnfitActorRooms(pinned("nook", "chat"), resolve)).not.toThrow()
    expect(() => refuseUnfitActorRooms(pinned("passage", "riddle"), resolve)).not.toThrow()
    expect(() => refuseUnfitActorRooms(pinned("passage", "chat"), resolve)).toThrow(RoomFault)
    expect(() => refuseUnfitActorRooms(pinned("passage", "chat"), resolve)).toThrow(
      /journey=made_up pyramid=1 floor=0 node=main#3: room passage/
    )
  })

  it("names a pinned room in a side section by its section", () => {
    const configs = floorWith({
      sideSections: [
        {
          encounter: "chat",
          prefabs: { passage },
          prefabsByIndex: { 0: "passage" },
        } as unknown as FloorConfig["sideSections"][number],
      ],
    })
    expect(() => refuseUnfitActorRooms(configs, resolve)).toThrow(/node=s0#1: room passage/)
  })

  it("a node whose encounter has somebody and no room carves and bakes", () => {
    expect(() => refuseUnfitActorRooms(floorWith({ encountersByIndex: { 0: "chat" } }), resolve)).not.toThrow()
    const placed = floorWith({ encounter: "chat", prefabs: { passage }, prefabPlacements: [] })
    expect(() => refuseUnfitActorRooms(placed, resolve)).not.toThrow()
  })
})
