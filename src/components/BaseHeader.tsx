import { useState } from "react"
import { useTranslation } from "react-i18next"
import { SettingsModal } from "@/ui/SettingsModal"

export const BaseHeader = () => {
  const { t } = useTranslation("common")
  const [showSettingsModal, setShowSettingsModal] = useState(false)

  return (
    <>
      <div className="flex w-full flex-row justify-between border bg-gray-100 px-4 py-2 sm:col-span-6">
        <p>Shop</p>
        <h1 className="text-center font-pyramid text-2xl font-bold">
          Pyramid Scheme
        </h1>
        <button
          onClick={() => setShowSettingsModal(true)}
          className="cursor-pointer bg-transparent font-medium text-gray-800 hover:text-gray-600"
        >
          {t("ui.settings")}
        </button>
      </div>

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </>
  )
}
