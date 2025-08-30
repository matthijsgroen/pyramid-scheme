import { useTranslation } from "react-i18next"

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation()

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => changeLanguage("en")}
        className={`rounded px-3 py-1 text-sm ${
          i18n.language === "en" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
        }`}
      >
        English
      </button>
      <button
        onClick={() => changeLanguage("nl")}
        className={`rounded px-3 py-1 text-sm ${
          i18n.language === "nl" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
        }`}
      >
        Nederlands
      </button>
    </div>
  )
}
