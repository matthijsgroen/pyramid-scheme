import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { spokenLines, type Speaker } from "@/app/fez/arrivalConversation"
import { REVISITS, revisitLines, sceneOnVisit } from "./revisits"

const heard = (...ids: string[]): Record<string, boolean> => Object.fromEntries(ids.map(id => [id, true]))

const linesIn = (locale: string) => {
  const doc = JSON.parse(readFileSync(`public/locales/${locale}/fez.json`, "utf8"))
  return (key: string) => key.split(".").reduce<unknown>((at, part) => (at as Record<string, unknown>)?.[part], doc)
}

describe(sceneOnVisit, () => {
  it("plays the whole scene while it has not been heard", () => {
    expect(sceneOnVisit("tomb.starter", heard())).toBe("tomb.starter")
    expect(sceneOnVisit("tomb.starter", heard("tomb.junior", "tomb.expert"))).toBe("tomb.starter")
  })

  it("plays one line from the state the story is in once the scene has been heard", () => {
    const line = sceneOnVisit("tomb.starter", heard("tomb.starter"), () => 0)

    expect(line).toBe(revisitLines("tomb.starter", heard("tomb.starter"))[0])
  })

  it("picks among the state's lines with the picker it is given", () => {
    const lines = revisitLines("tomb.starter", heard("tomb.starter"))

    expect(sceneOnVisit("tomb.starter", heard("tomb.starter"), () => 0.99)).toBe(lines.at(-1))
  })

  it("replays the scene when nothing is written for coming back", () => {
    expect(sceneOnVisit("tomb.expertB", heard("tomb.expertB"))).toBe("tomb.expertB")
  })
})

describe("Ipi, coming back", () => {
  it("points north to Henut while she has not been met", () => {
    expect(revisitLines("tomb.starter", heard("tomb.starter"))).toEqual([
      "revisit.starter.north1",
      "revisit.starter.north2",
    ])
  })

  it("asks whether she paid once her scene has been heard", () => {
    expect(revisitLines("tomb.starter", heard("tomb.starter", "tomb.junior"))).toEqual([
      "revisit.starter.paid1",
      "revisit.starter.paid2",
    ])
  })

  it("has only a short word to say once the story has moved past her", () => {
    expect(revisitLines("tomb.starter", heard("tomb.starter", "tomb.junior", "tomb.expert"))).toEqual([
      "revisit.starter.later1",
      "revisit.starter.later2",
    ])
  })
})

describe("Henut, coming back", () => {
  it("still wants her wall put right before anything else", () => {
    expect(revisitLines("tomb.junior", heard("tomb.junior"))[0]).toMatch(/^revisit\.junior\.wall/)
  })

  it("sends the player to Karnak once the wall is fixed, and asks after the priest once he is met", () => {
    expect(revisitLines("tomb.junior", heard("tomb.junior", "tomb.juniorFixed"))[0]).toMatch(/\.priest/)
    expect(revisitLines("tomb.junior", heard("tomb.junior", "tomb.juniorFixed", "tomb.expert"))[0]).toMatch(/\.met/)
  })
})

describe("every revisit line", () => {
  const all = Object.values(REVISITS).flatMap(states => states.flatMap(state => state.lines))

  it.each(["en", "nl"])("is written in %s", locale => {
    const has = linesIn(locale)
    expect(all.filter(id => spokenLines(id, key => typeof has(key) === "string").length === 0)).toEqual([])
  })

  it("is the ghost's alone, so it can play before Fez is met and never leaves anyone answering nobody", () => {
    const has = linesIn("en")
    const speakers = new Set<Speaker>(
      all.flatMap(id => spokenLines(id, key => typeof has(key) === "string").map(line => line.speaker))
    )
    expect([...speakers].filter(speaker => speaker === "fez" || speaker === "explorer")).toEqual([])
  })

  it("is one line — coming back is a word, not a scene", () => {
    const has = linesIn("en")
    expect(all.filter(id => spokenLines(id, key => typeof has(key) === "string").length !== 1)).toEqual([])
  })

  it("ends every list on a state with no condition, so a heard scene always has something to say", () => {
    expect(Object.entries(REVISITS).filter(([, states]) => states.at(-1)?.after !== undefined)).toEqual([])
  })
})
