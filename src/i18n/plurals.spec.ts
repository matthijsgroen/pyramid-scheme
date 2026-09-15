import { beforeAll, describe, expect, it } from "vitest"
import { createInstance, type i18n as I18n } from "i18next"
import { readdirSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

/**
 * That every plural form the shipped locales need actually resolves — checked as a MECHANISM, over
 * whatever locales exist, rather than as a list of expected sentences.
 *
 * The defect being guarded is i18next's failure mode: a missing plural form is answered with the key
 * itself, so it reaches the player as raw text like `chest.money_other`. That is invisible to the rest of
 * the suite, which mocks `t` with an identity function and can only see the interpolation payload.
 *
 * **Nothing here asserts what a sentence says.** The game is headed for most European languages and
 * translators are meant to adapt prose freely, so an expectation like "Opgelost met 1 hint" is a test that
 * fails on a good translation. It also scales badly: a per-locale list of sentences is multiplied by every
 * language added, while the rules below are written once and cover all 57 pluralised keys rather than the
 * dozen somebody remembered — and a form nobody listed is exactly how the raw-key bug ships.
 */

// Vitest runs from the project root, which is also where the served locale files live.
const localesDir = resolve(process.cwd(), "public/locales")
const locales = readdirSync(localesDir, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)

const bundles = Object.fromEntries(
  locales.map(locale => [
    locale,
    JSON.parse(readFileSync(`${localesDir}/${locale}/common.json`, "utf8")) as Record<string, unknown>,
  ])
)

/** The locale the others are measured against for SHAPE — never for wording. */
const reference = locales.includes("en") ? "en" : locales[0]

/** Every plural category CLDR knows. English uses two of them; Polish uses four. */
const SUFFIXES = ["zero", "one", "two", "few", "many", "other"] as const

/** Dotted keys of every leaf string in a bundle, so a plural form nested three levels deep is still seen. */
const leafKeys = (node: unknown, prefix = ""): string[] => {
  if (typeof node === "string") return [prefix]
  if (node === null || typeof node !== "object") return []
  return Object.entries(node).flatMap(([key, value]) => leafKeys(value, prefix ? `${prefix}.${key}` : key))
}

/** The base keys a locale writes plural forms for, mapped to the categories it actually supplies. */
const pluralForms = (bundle: Record<string, unknown>) => {
  const forms = new Map<string, Set<string>>()
  for (const key of leafKeys(bundle)) {
    const suffix = SUFFIXES.find(each => key.endsWith(`_${each}`))
    if (!suffix) continue
    const base = key.slice(0, -(suffix.length + 1))
    const seen = forms.get(base) ?? new Set<string>()
    seen.add(suffix)
    forms.set(base, seen)
  }
  return forms
}

const stringAt = (bundle: Record<string, unknown>, key: string): string | undefined => {
  const value = key.split(".").reduce<unknown>((node, part) => {
    if (node === null || typeof node !== "object") return undefined
    return (node as Record<string, unknown>)[part]
  }, bundle)
  return typeof value === "string" ? value : undefined
}

/**
 * The `{{name}}`s one plural form interpolates, minus `count`.
 *
 * `count` is left out on purpose: whether a form spells its number is a choice the language gets to make
 * ("a coin" against "1 coin"), and demanding agreement there would fail a good translation. Every OTHER
 * name is a value the caller supplies, so a form that drops one renders it as literal text or loses it
 * silently — and neither of those is a translator's prerogative.
 */
const placeholders = (bundle: Record<string, unknown>, key: string): string | undefined => {
  const value = stringAt(bundle, key)
  if (value === undefined) return undefined
  const names = new Set<string>()
  for (const [, name] of value.matchAll(/\{\{\s*([\w.]+)[^}]*\}\}/g)) if (name !== "count") names.add(name)
  return [...names].sort().join("+")
}

/**
 * A count that lands in the given category for this language — found rather than tabulated, because which
 * integer means "few" is a property of the language and not something this file should claim to know.
 *
 * Some categories are only reachable with a fraction (Spanish "many" is about large numbers, Welsh "zero"
 * is literally 0), so a category no integer under 200 selects is left alone rather than guessed at.
 */
const countFor = (locale: string, category: string): number | undefined => {
  const rules = new Intl.PluralRules(locale)
  for (let count = 0; count <= 200; count++) if (rules.select(count) === category) return count
  return undefined
}

describe("plural forms resolve in every shipped locale", () => {
  let i18n: I18n

  beforeAll(async () => {
    i18n = createInstance()
    await i18n.init({
      lng: reference,
      // No fallback: a locale falling back to English would hide exactly the miss this file looks for.
      fallbackLng: false,
      interpolation: { escapeValue: false },
      resources: Object.fromEntries(locales.map(locale => [locale, { common: bundles[locale] }])),
    })
  })

  it("found locales to check", () => {
    // A rename of public/locales would otherwise turn this whole file into zero silent tests.
    expect(locales.length).toBeGreaterThan(0)
    expect(Object.values(bundles).every(bundle => leafKeys(bundle).length > 0)).toBe(true)
  })

  describe.each(locales)("%s", locale => {
    const forms = pluralForms(bundles[locale])
    const required = new Intl.PluralRules(locale).resolvedOptions().pluralCategories

    it("pluralises something at all", () => {
      expect(forms.size).toBeGreaterThan(0)
    })

    it("supplies every category this language needs, for every key it pluralises", () => {
      // Partial coverage is the failure that ships: a key with `_one` and no `_other` reads perfectly on a
      // board with one square and as a raw key on the next one. Only keys this locale already pluralises
      // are checked — one it has not translated at all is a different thing, and not this file's business.
      const missing = [...forms]
        .flatMap(([base, supplied]) => required.filter(each => !supplied.has(each)).map(each => `${base}_${each}`))
        .sort()
      expect(missing).toEqual([])
    })

    it("interpolates the same caller-supplied names as the reference locale", () => {
      // Compared form by form rather than key by key: a union across a key's forms hides a placeholder
      // dropped from exactly one of them, which is the version of this bug that reaches a player on the
      // one board in ten where that form is the one selected.
      const referenceForms = pluralForms(bundles[reference])
      const drift: string[] = []
      for (const [base, supplied] of forms) {
        if (!referenceForms.has(base)) continue
        for (const category of supplied) {
          const key = `${base}_${category}`
          const mine = placeholders(bundles[locale], key)
          const theirs = placeholders(bundles[reference], key)
          if (theirs === undefined || mine === theirs) continue
          drift.push(`${key}: ${mine || "none"} vs ${reference} ${theirs || "none"}`)
        }
      }
      expect(drift).toEqual([])
    })

    it("renders every plural form as text rather than as its own key", () => {
      const t = i18n.getFixedT(locale, "common")
      const raw: string[] = []
      for (const base of forms.keys())
        for (const category of required) {
          const count = countFor(locale, category)
          if (count === undefined) continue
          const rendered = t(base, { count })
          // i18next answers a form it cannot find with the key, and leaves `{{count}}` standing when the
          // caller's interpolation option is named anything else.
          if (rendered === base || rendered.startsWith(`${base}_`) || rendered.includes("{{count}}"))
            raw.push(`${base} @ ${category} (count ${count}) → ${rendered}`)
        }
      expect(raw).toEqual([])
    })
  })
})

/**
 * Two sentences, kept deliberately.
 *
 * The rules above prove a form resolves; they cannot prove the harness is wired up at all. A silently
 * empty locale list or a bundle that failed to parse would make every rule above vacuously true, and these
 * are the smoke test for that — the only place in this file where changing a translation changes a result,
 * which is why it is one key rather than fifty.
 */
describe("the harness itself resolves", () => {
  it("picks the singular and the plural apart", async () => {
    const i18n = createInstance()
    await i18n.init({
      lng: reference,
      fallbackLng: false,
      interpolation: { escapeValue: false },
      resources: { [reference]: { common: bundles[reference] } },
    })
    const t = i18n.getFixedT(reference, "common")
    expect(t("chest.money", { count: 1 })).toBe("1 coin")
    expect(t("chest.money", { count: 2 })).toBe("2 coins")
  })
})
