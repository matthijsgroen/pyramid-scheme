import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { sceneFor } from "./sceneFor"

/**
 * The world and the script, checked against each other.
 *
 * A conversation room is authored in `src/worldGen/spec/`, and the lines it plays are authored in
 * `fez.json` — two files, no compiler between them. A room placed where nothing is written renders a
 * companion saying "not-found" in a tomb, and a scene written for a room nobody placed is simply
 * never heard. Both are silent failures; neither shows up in a type check or a world validation.
 */
const rooms = (): { journeyId: string; floor: number; index: number }[] => {
  const found: { journeyId: string; floor: number; index: number }[] = []
  for (const [journeyId, levels] of Object.entries(generatedWorldConfigs))
    levels.forEach((floors, floor) =>
      floors.forEach(section => {
        for (const [index, encounter] of Object.entries(section.encountersByIndex ?? {}))
          if (encounter === "conversation") found.push({ journeyId, floor, index: Number(index) })
      })
    )
  return found
}

const scenes = (locale: string): Record<string, unknown> =>
  JSON.parse(readFileSync(`public/locales/${locale}/fez.json`, "utf8")).tomb ?? {}

describe("every conversation room in the world", () => {
  it("has a scene written for it, in both languages", () => {
    const missing: string[] = []
    for (const room of rooms()) {
      const scene = sceneFor(room.journeyId)
      const id = scene?.replace(/^tomb\./, "")
      for (const locale of ["en", "nl"])
        if (!id || !scenes(locale)[id]) missing.push(`${locale}: ${room.journeyId} wants ${scene ?? "nothing"}`)
    }
    expect(missing).toEqual([])
  })

  it("never stands ahead of a tableau, which is numbered by its position", () => {
    // `resolveTableauKeyRequirements` reads `levelNr = pathIndex + 1`, so a room inserted before a
    // tableau renumbers it and asks for authored content that does not exist. World generation fails
    // outright when that happens — this says why, and keeps the rule where the placements are.
    const ahead: string[] = []
    for (const [journeyId, levels] of Object.entries(generatedWorldConfigs))
      levels.forEach((floors, floor) =>
        floors.forEach(section => {
          const byIndex = section.encountersByIndex ?? {}
          const talk = Object.entries(byIndex)
            .filter(([, encounter]) => encounter === "conversation")
            .map(([index]) => Number(index))
          const tableaus = Object.entries(byIndex)
            .filter(([, encounter]) => encounter === "tableau")
            .map(([index]) => Number(index))
          for (const at of talk)
            if (tableaus.some(tableau => tableau > at)) ahead.push(`${journeyId} floor ${floor}, room ${at}`)
        })
      )
    expect(ahead).toEqual([])
  })
})
