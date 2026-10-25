import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { spokenLines } from "@/app/fez/arrivalConversation"
import { DRAFT_BEATS, WAITING_BEATS } from "../drafts"
import { STORY_BEATS } from "./storyBeats"

const hasLineIn = (locale: string) => {
  const doc: unknown = JSON.parse(readFileSync(join("public/locales", locale, "fez.json"), "utf8"))
  return (key: string): boolean =>
    typeof key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], doc) === "string"
}

describe("the declared story beats", () => {
  it.each(["nl", "en"])("each have a first line in %s", locale => {
    const hasLine = hasLineIn(locale)
    expect([...STORY_BEATS].filter(id => spokenLines(id, hasLine).length === 0)).toEqual([])
  })

  it("leave the animal scenes unwired", () => {
    expect([...STORY_BEATS].filter(id => id.startsWith("animal."))).toEqual([])
  })

  it("wire every drafted tomb, camp and structure beat", () => {
    const drafted = [...DRAFT_BEATS.tombs, ...DRAFT_BEATS.camp, ...DRAFT_BEATS.structures]
    expect(drafted.filter(id => !STORY_BEATS.has(id))).toEqual([])
  })

  it("leave every waiting beat out", () => {
    expect(Object.keys(WAITING_BEATS).filter(id => STORY_BEATS.has(id))).toEqual([])
  })

  it("leave bond.master out, since the arc that triggers it is not built", () => {
    expect(STORY_BEATS.has("bond.master")).toBe(false)
  })
})
