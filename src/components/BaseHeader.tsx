import { use, useState } from "react"
import { useTranslation } from "react-i18next"
import { SettingsModal } from "@/app/SettingsModal"
import { DevelopContext } from "@/contexts/DevelopMode"
import { Header } from "@/ui/Header"

export const BaseHeader = () => {
  const { t } = useTranslation("common")
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const { setDevelopMode } = use(DevelopContext)

  return (
    <>
      <Header className="bg-amber-800 text-yellow-400">
        <button
          onClick={() => setShowSettingsModal(true)}
          className="cursor-pointer bg-transparent font-medium hover:text-gray-600"
        >
          {t("ui.settings")}
        </button>
        <h1
          className="text-center font-pyramid text-2xl font-bold"
          onClick={() => {
            if (process.env.NODE_ENV === "development") {
              setDevelopMode(prev => !prev)
            }
          }}
        >
          Pyramid Scheme
        </h1>
        <span></span>
      </Header>

      <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
    </>
  )
}
