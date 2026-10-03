import { describe, expect, it } from "vitest"
import en from "../../../../../public/locales/en/common.json"
import nl from "../../../../../public/locales/nl/common.json"
import { HANDLE_SIDES } from "@/game/siteTypes"
import { HANDLE_META } from "../../game/handle/meta"

/**
 * The lever's screen is the fourth layer that has to spell its two sides the same way: the assembler
 * tags gates with them, the record declares them, the save stores one, and the button asks the locale
 * files for `handle.<side>`. The component's own spec stubs `useTranslation` to echo the key, so a side
 * missing from a locale reads as a button there and an untranslated key in the player's face here.
 */
const ROOM_COPY = ["name", "goal", "invitation"]

const read = (locale: unknown, key: string): unknown =>
  ((locale as Record<string, unknown>)[HANDLE_META.id] as Record<string, unknown>)?.[key]

describe("the lever's copy", () => {
  it.each(ROOM_COPY)("says %s in both languages", key => {
    for (const locale of [en, nl]) expect(read(locale, key)).toBeTypeOf("string")
  })

  it.each(HANDLE_SIDES)("names the %s side in both languages", side => {
    for (const locale of [en, nl]) expect(read(locale, side)).toBeTypeOf("string")
  })
})
