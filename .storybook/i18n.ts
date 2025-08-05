import i18n from "i18next"
import { initReactI18next } from "react-i18next"

// Import your translation files
import commonEn from "../public/locales/en/common.json"
import commonNl from "../public/locales/nl/common.json"
import treasuresEn from "../public/locales/en/treasures.json"
import treasuresNl from "../public/locales/nl/treasures.json"

i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  debug: false,
  interpolation: {
    escapeValue: false,
  },
  resources: {
    en: {
      common: commonEn,
      treasures: treasuresEn,
    },
    nl: {
      common: commonNl,
      treasures: treasuresNl,
    },
  },
})

export default i18n
