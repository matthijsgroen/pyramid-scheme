import { type FC, useState, useEffect } from "react"
import { useTranslation } from "react-i18next"

type SettingsModalProps = {
  isOpen: boolean
  onClose: () => void
}

export const SettingsModal: FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation("common")
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language)

  // Update local state when i18n language changes
  useEffect(() => {
    setSelectedLanguage(i18n.language)
  }, [i18n.language])

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language)
    i18n.changeLanguage(language)
  }

  const handleClose = () => {
    onClose()
  }

  if (!isOpen) return null

  const availableLanguages = ["en", "nl"] // Fallback to hardcoded languages

  // Language display names
  const languageNames: Record<string, string> = {
    en: "English",
    nl: "Nederlands",
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative z-10 mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{t("ui.settings")}</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600" aria-label={t("ui.close")}>
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Language Selection */}
          <div>
            <label htmlFor="language-select" className="mb-2 block text-sm font-medium text-gray-700">
              {t("ui.language")}
            </label>
            <select
              id="language-select"
              value={selectedLanguage}
              onChange={e => handleLanguageChange(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              {availableLanguages.map(lang => (
                <option key={lang} value={lang}>
                  {languageNames[lang] || lang}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleClose}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
          >
            {t("ui.done")}
          </button>
        </div>
      </div>
    </div>
  )
}
