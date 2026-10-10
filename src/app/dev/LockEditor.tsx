import { useDeferredValue, useMemo, useState, type FC } from "react"
import { useTranslation } from "react-i18next"
import { LockPlayground } from "@/app/SiteMap/lockPlayground"
import { DeveloperButton } from "@/ui/atoms/DeveloperButton"
import { encodeLockHash, initialLockText } from "./lockEditorUrl"
import { lockReport } from "./lockReport"

const checkTone = (check: string) =>
  check.startsWith("✗") ? "text-red-300" : check.startsWith("⚠") ? "text-amber-300" : "text-white/80"

// Designing a lock on a phone: the notation, the checks `yarn lock` runs, its drawing, and a floor carved from it.
// The text lives in the URL hash, so a copied link reproduces the lock.
export const LockEditor: FC<{ initialText?: string; onClose?: () => void }> = ({
  initialText = initialLockText(window.location.hash),
  onClose,
}) => {
  const { t } = useTranslation()
  const [text, setText] = useState(initialText)
  const [playing, setPlaying] = useState(false)
  const [copied, setCopied] = useState<"copied" | "failed" | null>(null)
  // The walk can take a while on a big lock: typing stays responsive and the checks catch up.
  const shown = useDeferredValue(text)
  const report = useMemo(() => lockReport(shown), [shown])

  const edit = (next: string) => {
    setText(next)
    setCopied(null)
    window.history.replaceState(null, "", encodeLockHash(next))
  }
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}${encodeLockHash(text)}`)
      setCopied("copied")
    } catch {
      setCopied("failed")
    }
  }

  if (playing)
    return (
      <div className="flex h-(--screen-height) flex-col overflow-y-auto bg-neutral-900 text-white">
        <div className="sticky top-0 z-10 bg-neutral-900 p-2">
          <DeveloperButton label={t("devLockEditor.backToEditor")} onClick={() => setPlaying(false)} />
        </div>
        <LockPlayground locks={{ lock: text }} />
      </div>
    )

  return (
    <div className="flex h-(--screen-height) flex-col gap-3 overflow-y-auto bg-neutral-900 p-4 text-white">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold tracking-wide text-red-300 uppercase">{t("devLockEditor.title")}</h2>
        {onClose && <DeveloperButton label={t("devLockEditor.close")} onClick={onClose} />}
      </div>
      <textarea
        aria-label={t("devLockEditor.notation")}
        value={text}
        onChange={e => edit(e.target.value)}
        rows={10}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className="w-full rounded-md border border-red-400 bg-stone-950 p-2 font-mono text-base text-white"
      />
      <div className="flex flex-wrap items-center gap-2">
        <DeveloperButton label={t("devLockEditor.carveAndPlay")} onClick={() => setPlaying(true)} />
        <DeveloperButton label={t("devLockEditor.copyLink")} onClick={copyLink} />
        {copied && (
          <span role="status" className="text-sm text-white/80">
            {t(`devLockEditor.${copied}`)}
          </span>
        )}
      </div>
      <section aria-label={t("devLockEditor.checks")}>
        <h3 className="mb-1 text-xs font-bold text-white/60 uppercase">{t("devLockEditor.checks")}</h3>
        <ul className="font-mono text-sm">
          {report.checks.map(check => (
            <li key={check} className={checkTone(check)}>
              {check}
            </li>
          ))}
        </ul>
      </section>
      {report.drawing !== "" && (
        <section aria-label={t("devLockEditor.drawing")}>
          <h3 className="mb-1 text-xs font-bold text-white/60 uppercase">{t("devLockEditor.drawing")}</h3>
          <pre className="overflow-x-auto rounded-md bg-stone-950 p-2 font-mono text-xs">{report.drawing}</pre>
        </section>
      )}
    </div>
  )
}
