import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { GHOSTS, JOURNEYS_WITH_ARRIVAL, type Speaker } from "./arrivalConversation"
import { PORTRAITS } from "./portraits"

/**
 * The arrivals as authored, checked against the two rules the player would otherwise find.
 *
 * `arrivalLines` stops at the first missing index rather than scanning past it, so a scene numbered
 * 1, 2, 4 plays two lines and drops the rest — on a screen, in a language nobody is reading, silently.
 * And a journey listed without keys behind it renders the not-found string where its beat should be.
 */
/** Every authored scene in a locale, keyed by its conversation id — the arrivals and the tombs alike. */
const scenes = (locale: string): Record<string, Record<string, Record<string, string>>> => {
  const doc = JSON.parse(readFileSync(join("public/locales", locale, "fez.json"), "utf8"))
  // Every group a beat can live in, plus "end", which is one scene rather than a group of them.
  const entries = ["arrival", "tomb", "bond", "reading", "altar"].flatMap(group =>
    Object.entries(doc[group] ?? {}).map(([id, lines]) => [`${group}.${id}`, lines] as [string, unknown])
  )
  if (doc.end) entries.push(["end", doc.end])
  return Object.fromEntries(entries) as Record<string, Record<string, Record<string, string>>>
}

const SPEAKERS: Speaker[] = ["fez", "explorer", ...GHOSTS]
const LOCALES = ["en", "nl"]

describe("every authored arrival", () => {
  it("numbers its lines from 1 with no gap, in both languages", () => {
    const broken: string[] = []
    for (const locale of LOCALES)
      for (const [journey, lines] of Object.entries(scenes(locale))) {
        const numbers = Object.keys(lines)
          .map(Number)
          .sort((a, b) => a - b)
        const expected = numbers.map((_, i) => i + 1)
        if (numbers.join() !== expected.join()) broken.push(`${locale}/${journey}: ${numbers.join()}`)
      }
    expect(broken).toEqual([])
  })

  it("gives every line exactly one speaker the renderer knows", () => {
    const wrong: string[] = []
    for (const locale of LOCALES)
      for (const [journey, lines] of Object.entries(scenes(locale)))
        for (const [index, line] of Object.entries(lines)) {
          const speakers = Object.keys(line)
          if (speakers.length !== 1 || !SPEAKERS.includes(speakers[0] as Speaker))
            wrong.push(`${locale}/${journey}.${index}: ${speakers.join("+") || "nobody"}`)
        }
    expect(wrong).toEqual([])
  })

  it("plays the same scene in both languages, line for line", () => {
    const [english, dutch] = LOCALES.map(scenes)
    expect(Object.keys(dutch).sort()).toEqual(Object.keys(english).sort())
    for (const [journey, lines] of Object.entries(english))
      for (const [index, line] of Object.entries(lines))
        expect(Object.keys(dutch[journey]?.[index] ?? {}), `${journey}.${index}`).toEqual(Object.keys(line))
  })
})

describe("the declared list and the written scenes", () => {
  const arrivals = () =>
    Object.keys(scenes("en"))
      .filter(id => id.startsWith("arrival."))
      .map(id => id.slice("arrival.".length))

  it("names a journey only when there are lines behind it", () => {
    const written = arrivals()
    expect([...JOURNEYS_WITH_ARRIVAL].filter(journey => !written.includes(journey))).toEqual([])
  })

  it("declares every journey that has been written, or its beat never plays", () => {
    expect(arrivals().filter(journey => !JOURNEYS_WITH_ARRIVAL.has(journey))).toEqual([])
  })
})

describe("everyone who speaks", () => {
  it("has a portrait drawn for them, or the bubble opens beside nobody", () => {
    const missing = new Set<string>()
    for (const lines of Object.values(scenes("en")))
      for (const line of Object.values(lines))
        for (const speaker of Object.keys(line)) if (!PORTRAITS[speaker as Speaker]?.default) missing.add(speaker)
    expect([...missing]).toEqual([])
  })
})
