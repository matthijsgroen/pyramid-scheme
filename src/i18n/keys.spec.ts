import { describe, expect, it } from "vitest"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

// **A key that exists in no locale file renders as itself**, so `canisters.claim` shipped as the word
// "canisters.claim" on a button. Nothing else catches that: the suite mocks `t` with an identity function,
// and a missing key is not a type error.
//
// Namespace-blind on purpose — a key counts as translated if ANY shipped namespace has it. Tracking which
// `useTranslation(ns)` a `t` belongs to would cost a scope analysis to catch a mistake nobody makes; the
// one that does get made is a key written in no file at all.
const LOCALES = "public/locales"

const flatten = (value: unknown, prefix: string, into: Set<string>): void => {
  if (typeof value !== "object" || value === null) return void into.add(prefix)
  for (const [key, nested] of Object.entries(value)) flatten(nested, prefix ? `${prefix}.${key}` : key, into)
}

const shippedKeys = (locale = "en"): Set<string> => {
  const dir = join(LOCALES, locale)
  const keys = new Set<string>()
  for (const file of readdirSync(dir)) flatten(JSON.parse(readFileSync(join(dir, file), "utf8")), "", keys)
  // i18next resolves `x` from `x_one`/`x_other`, so a plural pair covers its own base key.
  for (const key of [...keys]) if (/_(one|other|zero|few|many)$/.test(key)) keys.add(key.replace(/_\w+$/, ""))
  return keys
}

const sources = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sources(path)
    return /\.tsx?$/.test(entry.name) && !/\.spec\./.test(entry.name) ? [path] : []
  })

describe("every translation key a screen asks for", () => {
  it("exists in the shipped locale files", () => {
    const shipped = shippedKeys()
    const missing: string[] = []
    for (const file of sources("src"))
      for (const [, key] of readFileSync(file, "utf8").matchAll(/\bt\(\s*"([a-zA-Z][\w.]*)"/g))
        if (!shipped.has(key)) missing.push(`${key} (${file})`)
    expect(missing).toEqual([])
  })

  /**
   * **And is written in both languages.** A key nobody translated does not fail either: `fallbackLng` is
   * English, so a Dutch player is quietly served the English string and the screen looks fine to anybody
   * testing it in English. Five detector strings sat like that. AGENTS.md asks for the two locales to move
   * together; this is what holds them to it.
   */
  it("is written in both languages", () => {
    const en = shippedKeys("en")
    const nl = shippedKeys("nl")
    expect([...en].filter(key => !nl.has(key))).toEqual([])
    expect([...nl].filter(key => !en.has(key))).toEqual([])
  })
})
