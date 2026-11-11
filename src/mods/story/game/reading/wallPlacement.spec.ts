import { describe, expect, it } from "vitest"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { childSectionsOf } from "@/game/carve/sections"
import type { SiteConfig, SubSection } from "@/game/siteTypes"
import { READING_META } from "./meta"
import { WALLS } from "./walls"

/**
 * The world and the walls, checked against each other.
 *
 * A reading room is authored in `src/worldGen/spec/`, and the wall it stands is authored in `walls.ts`, keyed
 * by its place — two files, no compiler between them. A room with no wall at its place closes the moment it
 * opens; a wall with no room at its place is never read; two rooms on one floor would share one wall. All
 * three are silent.
 */
const readingRoomsByPlace = (): Map<string, number> => {
  const count = new Map<string, number>()
  const tally = (place: string, section: Pick<SubSection, "encountersByIndex">) => {
    const here = Object.values(section.encountersByIndex ?? {}).filter(at => at === READING_META.id).length
    if (here > 0) count.set(place, (count.get(place) ?? 0) + here)
  }
  const walk = (place: string, sections: readonly SubSection[]) =>
    sections.forEach(section => {
      tally(place, section)
      walk(place, childSectionsOf(section))
    })
  for (const [journeyId, sites] of Object.entries(generatedWorldConfigs))
    (sites as unknown as readonly SiteConfig[]).forEach((floors, levelIndex) =>
      floors.forEach((floor, floorNr) => {
        const place = `${journeyId}@${levelIndex + 1}/${floorNr}`
        tally(place, floor)
        walk(place, floor.sideSections)
      })
    )
  return count
}

const wallPlaces = Object.entries(WALLS).flatMap(([journeyId, walls]) =>
  walls.map(wall => `${journeyId}@${wall.at.levelNr}/${wall.at.floor}`)
)

describe("every reading room in the world", () => {
  const rooms = readingRoomsByPlace()

  it("has its wall standing at its place", () => {
    expect([...rooms.keys()].filter(place => !wallPlaces.includes(place))).toEqual([])
  })

  it("is the only one on its floor, so the wall there is its own", () => {
    expect([...rooms].filter(([, count]) => count > 1)).toEqual([])
  })
})

describe("every wall", () => {
  it("stands where a reading room was placed", () => {
    const rooms = readingRoomsByPlace()

    expect(wallPlaces.filter(place => !rooms.has(place))).toEqual([])
  })
})
