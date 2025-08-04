import type { JourneyState } from "@/app/state/useJourneys"
import clsx from "clsx"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

export const TombExpedition: FC<{
  activeJourney: JourneyState
  onLevelComplete?: () => void
  onJourneyComplete?: () => void
  onClose?: () => void
}> = ({ onClose }) => {
  const { t } = useTranslation("common")
  return (
    <div
      className={
        "[container-type:size] relative flex h-dvh flex-col bg-slate-700"
      }
    >
      <div className="flex h-full w-full flex-col">
        <div className="flex-shrink-0 backdrop-blur-sm">
          <div
            className={clsx(
              "flex w-full items-center justify-between px-4 py-2",
              "text-white"
            )}
          >
            <button
              onClick={onClose}
              className="cursor-pointer text-lg font-bold focus:outline-none"
            >
              {t("ui.backArrow")}
            </button>
            <h1 className="pointer-events-none mt-0 inline-block pt-4 font-pyramid text-2xl font-bold">
              Tomb Expedition
            </h1>
            <span></span>
          </div>
        </div>
      </div>
    </div>
  )
}
