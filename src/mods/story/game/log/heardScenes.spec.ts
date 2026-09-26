import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { ALL_SCENES, heardScenes } from "./heardScenes"

const authored = (): Record<string, Record<string, unknown>> => {
  const doc = JSON.parse(readFileSync("public/locales/en/fez.json", "utf8"))
  return Object.fromEntries([
    ...Object.entries(doc.arrival ?? {}).map(([id, lines]) => [`arrival.${id}`, lines]),
    ...Object.entries(doc.tomb ?? {}).map(([id, lines]) => [`tomb.${id}`, lines]),
  ]) as Record<string, Record<string, unknown>>
}

describe(heardScenes, () => {
  it("lists only what this save has played", () => {
    const log = heardScenes({ "arrival.starter_1": true, "tomb.starter": true })

    expect(log.map(scene => scene.id)).toEqual(["arrival.starter_1", "tomb.starter"])
  })

  it("keeps a tutorial out of it, however many times the player sat through one", () => {
    const log = heardScenes({ pyramidIntro: true, shopFirstVisit: true, tombTutorial: true, welcome: true })

    expect(log).toEqual([])
  })

  it("says nothing about a beat that has not been heard", () => {
    // Absent rather than greyed out — a locked row with the place's name on it is a spoiler.
    const log = heardScenes({ "arrival.starter_1": true })

    expect(log.map(scene => scene.id)).not.toContain("arrival.wizard_2")
  })

  it("reads in the story's order, not the order the save recorded", () => {
    const log = heardScenes({ "tomb.wizard": true, "arrival.starter_2": true, "arrival.junior_1": true })

    expect(log.map(scene => scene.id)).toEqual(["arrival.starter_2", "arrival.junior_1", "tomb.wizard"])
  })

  it("names every scene after a journey the player can see on the map", () => {
    const journeys = JSON.parse(readFileSync("public/locales/en/journeys.json", "utf8"))

    expect(ALL_SCENES.filter(scene => !journeys[scene.journeyId]).map(scene => scene.id)).toEqual([])
  })

  it("knows about every scene that has been written, or the log quietly drops one", () => {
    const listed = new Set(ALL_SCENES.map(scene => scene.id))

    expect(Object.keys(authored()).filter(id => !listed.has(id))).toEqual([])
  })
})
