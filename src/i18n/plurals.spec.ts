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
    ["starBattle.hint.default.action.ruleOut", "en", 1, "Rule out the hatched square."],
    ["starBattle.hint.default.action.ruleOut", "en", 4, "Rule out the hatched squares."],
    ["starBattle.hint.default.action.ruleOut", "nl", 1, "Streep het gearceerde vakje af."],
    ["starBattle.hint.default.action.ruleOut", "nl", 4, "Streep de gearceerde vakjes af."],
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
    expect(t(lng, "starBattle.hint.default.action.place", { count, token: "⭐" })).toBe(expected)
  })

  /**
   * The star battle reasons that state a number, at both quotas the mechanic ships.
   *
   * These keys carry a dot of their own inside the `hint` block ("groupFull.row"), so the plural suffix
   * lands on a key i18next has to find by its literal name rather than by walking one more level. That is a
   * resolution path the identity-`t` suite cannot see through at all: a miss here reads as the raw key on a
   * two-star board and as perfectly fine text on a one-star one.
   */
  it.each([
    ["starBattle.hint.default.groupFull.region", "en", 1, "This region already has its ⭐."],
    ["starBattle.hint.default.groupFull.region", "en", 2, "This region already has its 2 ⭐."],
    ["starBattle.hint.default.groupTight.row", "en", 1, "This row is down to one square."],
    ["starBattle.hint.default.groupTight.row", "en", 2, "This row is down to 2 squares."],
    ["starBattle.hint.default.regionLine.row", "en", 2, "The marked region’s 2 ⭐ have to come from that row."],
    ["starBattle.hint.default.lineRegion.col", "en", 2, "That column’s 2 ⭐ belong to the marked region."],
    ["starBattle.hint.default.groupFull.region", "nl", 1, "Dit gebied heeft zijn ⭐ al."],
    ["starBattle.hint.default.groupFull.region", "nl", 2, "Dit gebied heeft zijn 2 ⭐ al."],
    ["starBattle.hint.default.groupTight.row", "nl", 2, "Deze rij heeft nog 2 vakjes over."],
    ["starBattle.hint.default.lineRegion.col", "nl", 2, "De 2 ⭐ van die kolom horen bij het gemarkeerde gebied."],
  ])("renders %s in %s for %i as %s", (key, lng, count, expected) => {
    expect(t(lng, key, { count, token: "⭐" })).toBe(expected)
  })

  /**
   * The same sentences over the mechanic's other face.
   *
   * Twin stars drawn for `agriculture` is a farm, and its wording is whole sentences rather than the sky's
   * with a noun swapped (`puzzle-screens.md` §4.3) — so the plural forms are its own too, and a missing one
   * here reaches the player as a raw key on a board that looks nothing like the one it was written for.
   */
  it.each([
    ["starBattle.hint.fields.groupTight.region", "en", 2, "This holding is down to 2 plots."],
    ["starBattle.hint.fields.onlyWay.region", "en", 2, "There is only one way to fit 2 🛖 on this holding."],
    ["starBattle.hint.fields.action.place", "en", 2, "Raise a 🛖 on each hatched plot."],
    ["starBattle.hint.fields.groupTight.region", "nl", 2, "Dit stuk land heeft nog 2 akkers over."],
    ["starBattle.hint.fields.onlyWay.region", "nl", 2, "Er is maar één manier om 2 🛖 op dit stuk land te zetten."],
    ["starBattle.hint.fields.action.place", "nl", 2, "Zet een 🛖 op elke gearceerde akker."],
  ])("renders %s in %s for %i as %s", (key, lng, count, expected) => {
    expect(t(lng, key, { count, token: "🛖" })).toBe(expected)
  })

  it.each([
    ["en", 2, "Every row, every column and every holding has exactly 2 farmsteads."],
    ["nl", 2, "Elke rij, elke kolom en elk stuk land heeft precies 2 boerderijen."],
  ])("renders the %s farm goal for a quota of %i as %s", (lng, count, expected) => {
    expect(t(lng, "starBattle.goal.fields", { count })).toBe(expected)
  })

  // The goal states which of the two rules the board is under, so it is the one line that must not fall
  // back to a shared wording.
  it.each([
    ["en", 1, "Every row, every column and every region holds exactly one star."],
    ["en", 2, "Every row, every column and every region holds exactly 2 stars."],
    ["nl", 1, "Elke rij, elke kolom en elk gebied heeft precies één ster."],
    ["nl", 2, "Elke rij, elke kolom en elk gebied heeft precies 2 sterren."],
  ])("renders the %s goal for a quota of %i as %s", (lng, count, expected) => {
    expect(t(lng, "starBattle.goal.default", { count })).toBe(expected)
  })
})
