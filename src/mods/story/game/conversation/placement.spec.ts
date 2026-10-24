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

/** Whether `<group>.<id>` has lines in `locale` — a tomb's scene and the meeting live in different groups. */
const written = (locale: string, scene: string): boolean => {
  const [group, id] = scene.split(".")
  return JSON.parse(readFileSync(`public/locales/${locale}/fez.json`, "utf8"))[group]?.[id] !== undefined
}

describe("every conversation room in the world", () => {
  it("has a scene written for it, in both languages", () => {
    const missing: string[] = []
    for (const room of rooms()) {
      const scene = sceneFor(room.journeyId)
      for (const locale of ["en", "nl"])
        if (!scene || !written(locale, scene)) missing.push(`${locale}: ${room.journeyId} wants ${scene ?? "nothing"}`)
    }
    expect(missing).toEqual([])
  })
})
