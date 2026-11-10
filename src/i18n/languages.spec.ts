import { describe, expect, it } from "vitest"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { LANGUAGE_CODES } from "./languages"

const LOCALES = "public/locales"
const PLURAL = /_(zero|one|two|few|many|other)$/

const strings = (locale: string): Map<string, string> => {
  const found = new Map<string, string>()
  const walk = (value: unknown, path: string) => {
    if (typeof value === "string") return void found.set(path, value)
    if (typeof value !== "object" || value === null) return
    for (const [key, nested] of Object.entries(value)) walk(nested, `${path}.${key}`)
  }
  for (const file of readdirSync(join(LOCALES, locale)))
    walk(JSON.parse(readFileSync(join(LOCALES, locale, file), "utf8")), file.replace(/\.json$/, ""))
  return found
}

const placeholders = (text: string): string[] => [...new Set(text.match(/{{\s*\w+\s*}}/g) ?? [])].sort()

// Plural forms differ per language (Polish has `_few`, Indonesian only `_other`), so a translated plural key
// is matched to the English `_other` of the same base.
const englishFor = (english: Map<string, string>, key: string): string | undefined =>
  english.get(key) ?? (PLURAL.test(key) ? english.get(key.replace(PLURAL, "_other")) : undefined)

describe("the shipped languages", () => {
  it("are exactly the locale folders", () => {
    const folders = readdirSync(LOCALES, { withFileTypes: true }).filter(entry => entry.isDirectory())
    expect(folders.map(entry => entry.name).sort()).toEqual([...LANGUAGE_CODES].sort())
  })

  const english = strings("en")

  describe.each(LANGUAGE_CODES.filter(code => code !== "en"))("%s", code => {
    const translated = strings(code)

    it("only translates keys English has", () => {
      expect([...translated.keys()].filter(key => englishFor(english, key) === undefined)).toEqual([])
    })

    it("keeps every placeholder English uses", () => {
      const drift = [...translated].flatMap(([key, text]) => {
        const source = englishFor(english, key)
        if (source === undefined) return []
        // `{{count}}` may be spelled out in a one-form ("one ring"), so only the other names must survive.
        const expected = placeholders(source).filter(name => !PLURAL.test(key) || name !== "{{count}}")
        const actual = placeholders(text).filter(name => !PLURAL.test(key) || name !== "{{count}}")
        return expected.join() === actual.join() ? [] : [`${key}: ${actual.join()} ≠ ${expected.join()}`]
      })
      expect(drift).toEqual([])
    })
  })
})
