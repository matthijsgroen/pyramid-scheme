import { type FC, use, useState } from "react"
import { useTranslation } from "react-i18next"
import { version } from "@/../package.json"
import { clearGameData, useGameStorage } from "@/support/useGameStorage"
import { CELL_KEY_VERSION, type StoredJourneyStateV3 } from "@/app/state/useJourneys"
import { ConfirmModal } from "@/ui/atoms/ConfirmModal"
import { DevelopContext } from "@/contexts/DevelopMode"
import { DeveloperButton } from "@/ui/atoms/DeveloperButton"
import { DevPanel } from "@/ui/molecules/DevPanel"
import { useDevActions } from "@/app/dev/useDevActions"
import { PuzzleLab } from "@/app/dev/PuzzleLab"
import { SaveTransfer } from "@/app/dev/SaveTransfer"
import { START_LOCK, encodeLockHash } from "@/app/dev/lockEditorUrl"
import { useJourneys } from "@/app/state/useJourneys"
import { useJourneyTranslations } from "@/app/translations/useJourneyTranslations"

// Module constant, not an inline literal: a fresh array every render makes useOfflineStorage look
// like it has a different default each time (same reason useJourneys keeps one).
const NO_JOURNEYS: StoredJourneyStateV3[] = []

type SettingsModalProps = {
  isOpen: boolean
  onClose: () => void
  // Opens the expedition after a dev jump or journey start.
  startGame: () => void
}

export const SettingsModal: FC<SettingsModalProps> = ({ isOpen, onClose, startGame }) => {
  const { t, i18n } = useTranslation("common")
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [tutorialsEnabled, setTutorialsEnabled] = useGameStorage<boolean>("tutorialsEnabled", true)
  const { isDevelopMode } = use(DevelopContext)
  const { startJourney } = useJourneys()
  const journeyList = useJourneyTranslations()
  const devActions = useDevActions(startGame)
  const shopTombJourney = journeyList.find(j => j.id === "junior_treasure_tomb")
  const [journeys, , journeysLoaded] = useGameStorage<StoredJourneyStateV3[]>("journeys", NO_JOURNEYS)

  // WHICH KEY FORMAT THIS SAVE IS ON, shown beside the app version so a player can read it out and the
  // answer to "has your save been migrated yet?" is a number rather than a guess. The lowest across
  // their journeys, because one left behind is the one that matters; a save with no journeys has
  // nothing to migrate and is current by definition. Unstamped reads 0 — see CELL_KEY_VERSION.
  const saveVersion = journeys.length
    ? Math.min(...journeys.map(journey => journey.cellKeyVersion ?? 0))
    : CELL_KEY_VERSION

  const handleClearGameData = async () => {
    await clearGameData()
    // Preserve the tutorials preference across a data wipe.
    await setTutorialsEnabled(tutorialsEnabled)
    window.location.reload()
  }

  // The chosen language IS i18n's language — read it, don't mirror it. This used to be local state
  // kept in step by an effect, which meant every language change rendered twice (once for the state,
  // once for useTranslation's own re-render) and the two could disagree in between.
  const selectedLanguage = i18n.language

  const handleLanguageChange = (language: string) => {
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
      <div className="relative z-10 mx-4 max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{t("ui.settings")}</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600" aria-label={t("ui.close")}>
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

        {isDevelopMode && (
          <div className="mt-6 space-y-4 rounded-lg bg-stone-900 p-3">
            {shopTombJourney && (
              <div className="flex justify-center">
                <DeveloperButton
                  onClick={async () => {
                    await startJourney(shopTombJourney)
                    startGame()
                  }}
                  label="Jump to Shop Tomb"
                />
              </div>
            )}
            <DevPanel title="Playtesting tools (every journey is pickable in develop mode)" actions={devActions} />
            <SaveTransfer />
            <div className="flex justify-center">
              <DeveloperButton
                onClick={() => (window.location.hash = encodeLockHash(START_LOCK))}
                label={t("devLockEditor.open")}
              />
            </div>
            <PuzzleLab />
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-4">
          <div className="text-sm text-gray-500">
            {t("ui.footer", { year: new Date().getFullYear(), version })}
            {/* Only once storage has actually been read — an unloaded store looks like no journeys at
                all, which would show "current" to a player whose save is not. */}
            {journeysLoaded && <span> {t("ui.saveVersion", { saveVersion })}</span>}
          </div>
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
