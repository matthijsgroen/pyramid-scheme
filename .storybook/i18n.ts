import i18n from "i18next"
import { initReactI18next } from "react-i18next"

// Import your translation files
import commonEn from "../public/locales/en/common.json"
import commonNl from "../public/locales/nl/common.json"
import treasuresEn from "../public/locales/en/treasures.json"
import treasuresNl from "../public/locales/nl/treasures.json"
import tableausEn from "../public/locales/en/tableaus.json"
import tableausNl from "../public/locales/nl/tableaus.json"
import fezNl from "../public/locales/nl/fez.json"
import fezEn from "../public/locales/en/fez.json"

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
      tableaus: tableausEn,
      fez: fezEn,
    },
    nl: {
      common: commonNl,
      treasures: treasuresNl,
      tableaus: tableausNl,
      fez: fezNl,
    },
  },
})

export default i18n
