import { type FC, Suspense, use, useState } from "react"
import { useTranslation } from "react-i18next"
import { version } from "@/../package.json"
import { languageChoices } from "@/i18n/languages"
import { LanguageSelect } from "@/ui/atoms/LanguageSelect"
import { clearGameData, useGameStorage } from "@/support/useGameStorage"
import { ConfirmModal } from "@/ui/atoms/ConfirmModal"
import { focusOnMount, trapTab } from "@/ui/atoms/dialogFocus"
import { DevelopContext } from "@/contexts/DevelopMode"
import { DevTools } from "@/app/dev/devToolsBuild"
import { SaveCardTransfer } from "@/app/saveCard/SaveCardTransfer"

type SettingsModalProps = {
  isOpen: boolean
  onClose: () => void
  // Opens the expedition after a dev jump or journey start.
  startGame: () => void
}

export const SettingsModal: FC<SettingsModalProps> = ({ isOpen, onClose, startGame }) => {
  const { t, i18n } = useTranslation("common")
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showSaveCard, setShowSaveCard] = useState(false)
  const [tutorialsEnabled, setTutorialsEnabled] = useGameStorage<boolean>("tutorialsEnabled", true)
  const { isDevelopMode } = use(DevelopContext)
  const handleClearGameData = async () => {
    await clearGameData()
    // Preserve the tutorials preference across a data wipe.
    await setTutorialsEnabled(tutorialsEnabled)
    window.location.reload()
  }

  // The chosen language IS i18n's language: read it, don't mirror it, so a change renders once and
  // the select can never disagree with it.
  const selectedLanguage = i18n.language

  const handleLanguageChange = (language: string) => {
    i18n.changeLanguage(language)
  }

  const handleClose = () => {
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div aria-hidden className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div
        ref={focusOnMount}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        tabIndex={-1}
        onKeyDown={trapTab}
        className="focus-brackets relative z-10 mx-4 max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-xl outline-none"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="settings-title" className="text-xl font-bold text-gray-900">
            {t("ui.settings")}
          </h2>
          <button
            data-input-back
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label={t("ui.close")}
          >
            <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <LanguageSelect
              id="language-select"
              value={selectedLanguage}
              {...languageChoices(navigator.languages ?? [])}
              onChange={handleLanguageChange}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Disable tutorials */}
          <label className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-gray-700">{t("ui.disableTutorials")}</span>
            <input
              type="checkbox"
              checked={!tutorialsEnabled}
              onChange={e => setTutorialsEnabled(!e.target.checked)}
              className="size-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </label>

          {/* Move the save to another device */}
          <div className="space-y-2">
            <button
              onClick={() => setShowSaveCard(open => !open)}
              aria-expanded={showSaveCard}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-800 transition-colors hover:bg-gray-50"
            >
              {t("saveCard.title")}
            </button>
            {showSaveCard && <SaveCardTransfer />}
          </div>

          {/* Clear game data */}
          <div>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="w-full rounded-lg border border-red-300 px-4 py-2 font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              {t("ui.clearGameData")}
            </button>
          </div>
        </div>

        {DevTools && isDevelopMode && (
          <Suspense fallback={null}>
            <DevTools startGame={startGame} onClose={handleClose} />
          </Suspense>
        )}

        <div className="mt-6 flex items-center justify-end gap-4">
          <div className="text-sm text-gray-500">{t("ui.footer", { year: new Date().getFullYear(), version })}</div>
          <button
            onClick={handleClose}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
          >
            {t("ui.done")}
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={showClearConfirm}
        title={t("ui.clearGameData")}
        message={t("ui.confirmClearGameData")}
        confirmText={t("ui.clearGameData")}
        cancelText={t("ui.cancel")}
        onConfirm={handleClearGameData}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  )
}
