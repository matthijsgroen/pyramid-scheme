import { beforeAll, describe, expect, it } from "vitest"
import { createInstance, type i18n as I18n } from "i18next"
import commonEn from "../../../../../public/locales/en/common.json"
import commonNl from "../../../../../public/locales/nl/common.json"

/**
 * The goal reads differently for a board asking one volume and a board asking three, and i18next picks the
 * form from `count`.
 *
 * **Worth a real i18next rather than the suite's identity `t`.** A missing `_one`/`_other` form resolves to
 * the raw key, and an interpolation option not literally named `count` skips plural selection entirely —
 * neither fails a typecheck, and the mocked `t` the screen specs use cannot see either.
 */
describe("the canisters goal", () => {
  let i18n: I18n

  beforeAll(async () => {
    i18n = createInstance()
    await i18n.init({
      lng: "en",
      fallbackLng: "en",
      interpolation: { escapeValue: false },
      // Mirrors src/i18n/index.ts, which names common as the default namespace.
      defaultNS: "common",
      ns: ["common"],
      resources: { en: { common: commonEn }, nl: { common: commonNl } },
    })
  })

  const t = (lng: string, count: number) => i18n.getFixedT(lng, "common")("canisters.goal.default", { count })

  it.each([
    ["en", 1],
    ["en", 3],
    ["nl", 1],
    ["nl", 3],
  ])("resolves to a sentence in %s for %i volumes", (lng, count) => {
    const sentence = t(lng, count)
    expect(sentence).not.toContain("canisters.goal")
    expect(sentence.length).toBeGreaterThan(20)
  })

  it.each(["en", "nl"])("words one volume differently from several, in %s", lng => {
    // The whole reason it takes a count: "measure out the volume" is wrong on a board asking for three.
    expect(t(lng, 1)).not.toBe(t(lng, 3))
  })

  it.each(["en", "nl"])("names no number, because the amount lives above the board, in %s", lng => {
    // It used to interpolate the target, which read as a fixed instruction and then changed under the
    // player each time a leg was claimed.
    expect(t(lng, 1)).not.toMatch(/\d/)
    expect(t(lng, 3)).not.toMatch(/\d/)
  })
})
