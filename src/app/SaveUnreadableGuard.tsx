import { useEffect, useState, type FC } from "react"
import { useTranslation } from "react-i18next"
import { dropOfflineStores, onSaveUnreadable } from "@/support/useOfflineStorage"
import { SaveUnreadable } from "@/ui/molecules/SaveUnreadable"

// Reloads tried for this tab, kept across the reload itself; past this many, starting over is offered.
const RELOADS_KEY = "saveUnreadable.reloads"
export const RELOADS_BEFORE_RESET = 3

const reloadsTried = (): number => {
  try {
    return Number(sessionStorage.getItem(RELOADS_KEY) ?? 0)
  } catch {
    return 0
  }
}

const setReloadsTried = (count: number) => {
  try {
    if (count === 0) sessionStorage.removeItem(RELOADS_KEY)
    else sessionStorage.setItem(RELOADS_KEY, String(count))
  } catch {
    // Without session storage every reload counts as the first; continuing stays offered.
  }
}

export const SaveUnreadableGuard: FC = () => {
  const { t } = useTranslation("common")
  const [mode, setMode] = useState<"none" | "notice" | "banner" | "confirmReset">("none")
  useEffect(() => onSaveUnreadable(() => setMode(current => (current === "none" ? "notice" : current))), [])
  if (mode === "none") return null
  const labels = {
    title: t("saveUnreadable.title"),
    body: t("saveUnreadable.body"),
    banner: t("saveUnreadable.banner"),
    reload: t("saveUnreadable.reload"),
    continue: t("saveUnreadable.continue"),
    reset: t("saveUnreadable.reset"),
    confirmReset: t("saveUnreadable.confirmReset"),
    confirmResetYes: t("saveUnreadable.confirmResetYes"),
    confirmResetNo: t("saveUnreadable.confirmResetNo"),
  }
  return (
    <SaveUnreadable
      mode={mode}
      labels={labels}
      onReset={reloadsTried() >= RELOADS_BEFORE_RESET ? () => setMode("confirmReset") : undefined}
      onReload={() => {
        setReloadsTried(reloadsTried() + 1)
        window.location.reload()
      }}
      onContinue={() => setMode("banner")}
      onConfirmReset={async () => {
        await dropOfflineStores()
        setReloadsTried(0)
        window.location.reload()
      }}
      onCancelReset={() => setMode("notice")}
    />
  )
}
