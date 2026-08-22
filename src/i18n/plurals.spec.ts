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

  /**
   * The move a hint asks for (`puzzle-screens.md` §4) names the squares it marked, so it has to agree with
   * how many there are — a hint reading "rule out the hatched squares" over one square is a hint the player
   * has to re-read. i18next answers a missing plural form with the key itself, which reaches them as raw
   * text, so both forms of every move are checked here rather than only their presence.
   */
  it.each([
    ["starBattle.hint.action.ruleOut", "en", 1, "Rule out the hatched square."],
    ["starBattle.hint.action.ruleOut", "en", 4, "Rule out the hatched squares."],
    ["starBattle.hint.action.ruleOut", "nl", 1, "Streep het gearceerde vakje af."],
    ["starBattle.hint.action.ruleOut", "nl", 4, "Streep de gearceerde vakjes af."],
    ["sumplete.hint.action.strike", "en", 1, "Cross out the hatched number."],
    ["sumplete.hint.action.strike", "en", 3, "Cross out the hatched numbers."],
    ["sumplete.hint.action.keep", "nl", 1, "Markeer het gearceerde getal als blijvend."],
    ["sumplete.hint.action.keep", "nl", 3, "Markeer de gearceerde getallen als blijvend."],
  ])("renders %s in %s for %i as %s", (key, lng, count, expected) => {
    expect(t(lng, key, { count })).toBe(expected)
  })

  it.each([
    ["en", 1, "Put ☀️ in the hatched square."],
    ["en", 5, "Put ☀️ in the hatched squares."],
    ["nl", 1, "Zet ☀️ in het gearceerde vakje."],
    ["nl", 5, "Zet ☀️ in de gearceerde vakjes."],
  ])("renders the %s eclipse move for %i as %s", (lng, count, expected) => {
    expect(t(lng, "eclipse.hint.action.fill", { count, mark: "☀️" })).toBe(expected)
  })

  it.each([
    ["en", 1, "Put a ⭐ in the hatched square."],
    ["en", 2, "Put a ⭐ in each hatched square."],
    ["nl", 1, "Zet een ⭐ in het gearceerde vakje."],
    ["nl", 2, "Zet een ⭐ in elk gearceerd vakje."],
  ])("renders the %s star battle placement for %i as %s", (lng, count, expected) => {
    expect(t(lng, "starBattle.hint.action.place", { count, star: "⭐" })).toBe(expected)
  })
})
