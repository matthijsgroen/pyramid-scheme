/**
 * The languages the game ships, each named in its own language for the picker. One entry per folder in
 * `public/locales`. English and Dutch are written by hand and always complete; every other language may lag
 * behind them, and a key it lacks falls back to English.
 */
export const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "nl", name: "Nederlands" },
  { code: "de", name: "Deutsch" },
  { code: "fr", name: "Français" },
  { code: "es", name: "Español (Latinoamérica)" },
  { code: "es-ES", name: "Español (España)" },
  { code: "pt-BR", name: "Português (Brasil)" },
  { code: "pt-PT", name: "Português (Portugal)" },
  { code: "it", name: "Italiano" },
  { code: "pl", name: "Polski" },
  { code: "cs", name: "Čeština" },
  { code: "sk", name: "Slovenčina" },
  { code: "hu", name: "Magyar" },
  { code: "ro", name: "Română" },
  { code: "bg", name: "Български" },
  { code: "el", name: "Ελληνικά" },
  { code: "ru", name: "Русский" },
  { code: "uk", name: "Українська" },
  { code: "be", name: "Беларуская" },
  { code: "hr", name: "Hrvatski" },
  { code: "sr", name: "Српски" },
  { code: "bs", name: "Bosanski" },
  { code: "sl", name: "Slovenščina" },
  { code: "mk", name: "Македонски" },
  { code: "sq", name: "Shqip" },
  { code: "lt", name: "Lietuvių" },
  { code: "lv", name: "Latviešu" },
  { code: "et", name: "Eesti" },
  { code: "fi", name: "Suomi" },
  { code: "sv", name: "Svenska" },
  { code: "da", name: "Dansk" },
  { code: "nb", name: "Norsk bokmål" },
  { code: "is", name: "Íslenska" },
  { code: "mt", name: "Malti" },
  { code: "tr", name: "Türkçe" },
  { code: "ca", name: "Català" },
  { code: "eu", name: "Euskara" },
  { code: "gl", name: "Galego" },
  { code: "cy", name: "Cymraeg" },
  { code: "ga", name: "Gaeilge" },
  { code: "fy", name: "Frysk" },
  { code: "id", name: "Bahasa Indonesia" },
] as const satisfies readonly { code: string; name: string }[]

export const LANGUAGE_CODES: string[] = LANGUAGES.map(language => language.code)

export type Language = (typeof LANGUAGES)[number]

/**
 * The shipped languages the browser says its user reads, in the browser's order: an exact code first
 * (`pt-BR`), else the first shipped variant of the same language (`nl-BE` reads Dutch, `es-MX` the first Spanish).
 */
export const preferredLanguages = (browser: readonly string[]): Language[] => {
  const base = (code: string) => code.toLowerCase().split("-")[0]
  const found: Language[] = []
  for (const wanted of browser) {
    const match =
      LANGUAGES.find(language => language.code.toLowerCase() === wanted.toLowerCase()) ??
      LANGUAGES.find(language => base(language.code) === base(wanted))
    if (match && !found.includes(match)) found.push(match)
  }
  return found
}

// Fixed to one locale, so the order is the same in every interface language: Latin, then Greek, then Cyrillic.
const byName = new Intl.Collator("en", { sensitivity: "base" })

/** The languages sorted by their own name, a letter with a mark beside the bare one (`Čeština` with C). */
export const byNativeName = (languages: readonly Language[]): Language[] =>
  [...languages].sort((a, b) => byName.compare(a.name, b.name))

/** The picker's two groups: the browser's languages in its order, then the rest by name. */
export const languageChoices = (browser: readonly string[]): { preferred: Language[]; others: Language[] } => {
  const preferred = preferredLanguages(browser)
  return { preferred, others: byNativeName(LANGUAGES.filter(language => !preferred.includes(language))) }
}
