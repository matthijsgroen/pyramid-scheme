import fez from "@/assets/fez.png"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

export const Fez: FC<{ conversation: string; onComplete: () => void }> = ({
  conversation,
  onComplete,
}) => {
  const { t } = useTranslation("fez")

  return (
    <div className="fixed inset-0 bg-black/10" onClick={onComplete}>
      <div className="pointer-events-none fixed bottom-0 left-0">
        <div className="mb-2 ml-15 max-w-xs origin-bottom-left animate-show-balloon rounded border border-black bg-white p-3 text-black shadow-lg">
          {t("welcome")}
        </div>
        <img
          src={fez}
          alt="Happy companion lizard wearing a fez"
          className="-mb-15 w-50"
        />
      </div>
    </div>
  )
}
