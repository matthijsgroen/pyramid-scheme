/**
 * The languages the game ships, each named in its own language for the picker. One entry per folder in
 * `public/locales`. English and Dutch are written by hand and always complete; every other language may lag
 * behind them, and a key it lacks falls back to English.
 */
export const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "nl", name: "Nederlands" },
] as const satisfies readonly { code: string; name: string }[]

export const LANGUAGE_CODES: string[] = LANGUAGES.map(language => language.code)
