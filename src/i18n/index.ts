import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import Backend from "i18next-http-backend"
import packageJson from "../../package.json"
import { LANGUAGE_CODES } from "./languages"

// Get version for cache busting
const getVersion = () => {
  // In production, use package version
  if (process.env.NODE_ENV === "production") {
    return `v${packageJson.version}`
  }
  // In development, use timestamp to always get fresh translations
  return Date.now().toString()
}

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    // A browser asking for `de-AT` gets `de`, one asking for `pt` gets the first Portuguese, and one asking for a
    // language the game lacks gets English — instead of fetching locale folders that do not exist.
    supportedLngs: LANGUAGE_CODES,
    load: "currentOnly",
    debug: process.env.NODE_ENV === "development",

    interpolation: {
      escapeValue: false, // React already escapes
    },

    backend: {
      loadPath: `${import.meta.env.BASE_URL}locales/{{lng}}/{{ns}}.json?v=${getVersion()}`,
    },

    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
    },

    // Default namespace
    defaultNS: "common",
    ns: ["common", "inventory", "journeys", "tableaus", "treasures", "sellables", "fez", "camp"],
  })

// `<html lang>` follows the game's language, so screen readers pronounce it right and `:lang()` styles apply.
i18n.on("languageChanged", language => document.documentElement.setAttribute("lang", language))

export default i18n
