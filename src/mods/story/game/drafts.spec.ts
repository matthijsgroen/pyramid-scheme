import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { spokenLines } from "@/app/fez/arrivalConversation"
import { DRAFT_BEATS, WAITING_BEATS } from "./drafts"

const hasLineIn = (locale: string) => {
  const doc: unknown = JSON.parse(readFileSync(join("public/locales", locale, "fez.json"), "utf8"))
  return (key: string): boolean =>
    typeof key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], doc) === "string"
}

const declared = [...Object.values(DRAFT_BEATS).flat(), ...Object.keys(WAITING_BEATS)]

describe("the drafted beats", () => {
  it.each(["nl", "en"])("each have a first line in %s", locale => {
    const hasLine = hasLineIn(locale)
    expect(declared.filter(id => spokenLines(id, hasLine).length === 0)).toEqual([])
  })

  it("are each listed in one area only", () => {
    const listed = Object.values(DRAFT_BEATS).flat()
    expect(listed.filter((id, index) => listed.indexOf(id) !== index)).toEqual([])
  })
})
