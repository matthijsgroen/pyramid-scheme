import { describe, expect, it } from "vitest"
import { LANGUAGES, byNativeName, languageChoices } from "./languages"

const names = byNativeName(LANGUAGES).map(language => language.name)

describe("byNativeName", () => {
  it("files a letter with a mark beside the bare letter", () =>
    expect(names.slice(names.indexOf("Català"), names.indexOf("Català") + 3)).toEqual(["Català", "Čeština", "Cymraeg"]))
  it("puts Latin names first, then Greek, then Cyrillic", () => {
    const greek = names.indexOf("Ελληνικά")
    expect(names.slice(0, greek).every(name => /^[\p{Script=Latin}]/u.test(name))).toBe(true)
    expect(names.slice(greek + 1).every(name => /^[\p{Script=Cyrillic}]/u.test(name))).toBe(true)
  })
})

describe("languageChoices", () => {
  it("keeps the browser's languages first and sorts only the rest", () => {
    const { preferred, others } = languageChoices(["nl-NL", "en"])
    expect(preferred.map(language => language.code)).toEqual(["nl", "en"])
    expect(others).toEqual(byNativeName(LANGUAGES.filter(language => !preferred.includes(language))))
  })
  it("sorts every language when the browser matches none", () =>
    expect(languageChoices(["ja"]).others).toEqual(byNativeName(LANGUAGES)))
})
