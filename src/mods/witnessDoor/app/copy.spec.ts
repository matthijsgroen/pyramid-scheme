import { describe, expect, it } from "vitest"
import en from "../../../../public/locales/en/common.json"
import nl from "../../../../public/locales/nl/common.json"

/**
 * The room says the same things in both languages, and one of those things is that choosing costs nothing.
 *
 * A player who reads the choice as final plays the room as a trap and never walks back in for the other
 * branch — the behaviour the accumulating keys exist to allow. A rules line that reached only one locale
 * would leave half the players believing it.
 */
const ROOM_COPY = ["name", "goal", "choose", "rules.shrines", "rules.choice", "rules.returning", "rules.tap"]

const read = (locale: unknown, path: string): unknown =>
  path
    .split(".")
    .reduce<unknown>(
      (at, key) => (at as Record<string, unknown>)?.[key],
      (locale as Record<string, unknown>).witnessDoor
    )

describe("the witness door's copy", () => {
  it.each(ROOM_COPY)("says %s in both languages", path => {
    for (const locale of [en, nl]) expect(read(locale, path)).toBeTypeOf("string")
  })

  it("names both shrines in both languages", () => {
    for (const locale of [en, nl])
      for (const shrine of ["east", "north"]) expect(read(locale, `shrine.${shrine}`)).toBeTypeOf("string")
  })
})
