import { describe, expect, it, beforeAll } from "vitest"
import { createInstance, type i18n as I18n } from "i18next"
import commonEn from "../../public/locales/en/common.json"
import commonNl from "../../public/locales/nl/common.json"

// The rest of the suite mocks react-i18next with an identity `t`, which cannot tell whether a
// plural form resolves — it only records the interpolation payload. These specs run the real
// i18next against the shipped locale files, so they catch a missing `_one`/`_other` form, an
// interpolation option that is not literally named `count` (i18next then skips plural selection
// entirely), and drift between the two locales.
describe("plural forms in the shipped locales", () => {
  let i18n: I18n

  beforeAll(async () => {
    i18n = createInstance()
    await i18n.init({
      lng: "en",
      fallbackLng: "en",
      interpolation: { escapeValue: false },
      resources: { en: { common: commonEn }, nl: { common: commonNl } },
    })
  })

  const t = (lng: string, key: string, opts: Record<string, unknown>) => i18n.getFixedT(lng, "common")(key, opts)

  it.each([
    ["en", 1, "Solved with 1 hint"],
    ["en", 3, "Solved with 3 hints"],
    ["nl", 1, "Opgelost met 1 hint"],
    ["nl", 3, "Opgelost met 3 hints"],
  ])("renders %s hint tally for %i as %s", (lng, count, expected) => {
    expect(t(lng, "ui.solvedWithHints", { count })).toBe(expected)
  })

  it.each([
    ["en", 1, "1 coin"],
    ["en", 2, "2 coins"],
    ["en", 42, "42 coins"],
    ["nl", 1, "1 munt"],
    ["nl", 2, "2 munten"],
  ])("renders %s money reward for %i as %s", (lng, count, expected) => {
    expect(t(lng, "chest.money", { count })).toBe(expected)
  })
})
