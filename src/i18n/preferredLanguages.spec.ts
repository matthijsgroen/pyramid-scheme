import { describe, expect, it } from "vitest"
import { preferredLanguages } from "./languages"

const codes = (browser: string[]) => preferredLanguages(browser).map(language => language.code)

describe("preferredLanguages", () => {
  it("keeps the browser's order", () => expect(codes(["nl-NL", "en-US", "de"])).toEqual(["nl", "en", "de"]))
  it("takes an exact variant over the base language", () =>
    expect(codes(["es-ES", "pt-BR"])).toEqual(["es-ES", "pt-BR"]))
  it("lists a language once", () => expect(codes(["en-US", "en-GB", "en"])).toEqual(["en"]))
  it("skips languages the game does not ship", () => expect(codes(["ja", "zh-CN"])).toEqual([]))
})
