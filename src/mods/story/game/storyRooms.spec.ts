import { describe, expect, it } from "vitest"
import type { FloorConfig } from "@/game/siteTypes"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { STORY_ROOMS, storyRoomPlace, type StoryRoom } from "./storyRooms"

const floor = (encountersByIndex?: FloorConfig["encountersByIndex"]): FloorConfig =>
  ({
    pathPuzzles: 3,
    difficulty: "starter",
    end: "treasure",
    exitOrStaircase: "exit",
    sideSections: [],
    encountersByIndex,
  }) as FloorConfig

const room: StoryRoom = { label: "x", journeyId: "j", encounter: "conversation", levelNr: 2, floor: 0 }

describe("storyRoomPlace", () => {
  it("stands the explorer in the room where one is authored", () => {
    expect(storyRoomPlace(room, [[floor()], [floor({ 1: "conversation" })]])).toEqual({
      levelNr: 2,
      address: "main#0/p1",
    })
  })

  it("stands the explorer at the site's entrance while the room is not authored", () => {
    expect(storyRoomPlace(room, [[floor()], [floor()]])).toEqual({ levelNr: 2, address: null })
  })

  it("never takes the same encounter from another floor than the one asked for", () => {
    expect(storyRoomPlace(room, [[floor()], [floor(), floor({ 0: "conversation" })]])).toEqual({
      levelNr: 2,
      address: null,
    })
  })
})

describe("every story room jump", () => {
  it("names a journey the world generates", () => {
    expect(STORY_ROOMS.filter(r => !generatedWorldConfigs[r.journeyId]).map(r => r.journeyId)).toEqual([])
  })
})
