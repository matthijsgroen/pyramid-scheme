import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import Backend from "i18next-http-backend"
import packageJson from "../../package.json"

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
    debug: process.env.NODE_ENV === "development",

    interpolation: {
      escapeValue: false, // React already escapes
    },

    backend: {
      loadPath: "/pyramid-scheme/locales/{{lng}}/{{ns}}.json?v=" + getVersion(),
    },

    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
    },

    // Default namespace
    defaultNS: "common",
    ns: ["common", "inventory", "journeys", "tableaus", "treasures", "fez"],
  })

export default i18n
