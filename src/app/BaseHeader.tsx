import { use, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { SettingsModal } from "@/app/SettingsModal"
import { DevelopContext } from "@/contexts/DevelopMode"
import { useSecretTaps } from "@/app/dev/useSecretTaps"
import { Header } from "@/ui/atoms/Header"

export const BaseHeader = () => {
  const { t } = useTranslation("common")
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const { isDevelopMode, setDevelopMode } = use(DevelopContext)

  // Seven taps on the title toggles develop mode — deliberately NOT gated on NODE_ENV, unlike the
  // single tap this replaces: phone playtesting happens against the deployed build, where that gate
  // made develop mode unreachable. See useSecretTaps for why seven taps is safe to ship.
  const { tap, remaining } = useSecretTaps(useCallback(() => setDevelopMode(prev => !prev), [setDevelopMode]))

  return (
    <>
      <Header className="bg-amber-800 text-yellow-400">
        <button
          onClick={() => setShowSettingsModal(true)}
          className="cursor-pointer bg-transparent font-medium hover:text-yellow-300"
          aria-label={t("ui.settings")}
        >
          <span className="material-icons ml-[-2px] text-center align-middle text-xl!">settings</span>
        </button>
        <h1 className="text-center font-pyramid text-2xl font-bold select-none" onClick={tap}>
          Pyramid Scheme
          {/* Taps land on a phone with no other feedback, so past the halfway point say how many are
              left — otherwise there's no way to tell the sequence is being counted at all. */}
          {remaining > 0 && remaining <= 3 && (
            <span className="ml-2 align-middle text-xs font-normal opacity-80">{remaining}…</span>
          )}
        </h1>
        <span className="text-xs font-bold text-red-300">{isDevelopMode ? "DEV" : ""}</span>
      </Header>

      <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
    </>
  )
}
