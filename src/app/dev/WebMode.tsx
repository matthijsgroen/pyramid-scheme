import { useState, type FC } from "react"
import { useTranslation } from "react-i18next"
import { WEB_SYNTAX } from "@/game/webNotation"
import type { ActivatorState, SimJourney, SimPin, SimPyramid, WebSimPull, WebSimView } from "@/game/webSimulation"
import { MarkChip } from "@/app/SiteMap/mark"
import { DeveloperButton } from "@/ui/atoms/DeveloperButton"
import type { WebEngine } from "./webEngine"
import { workerEngine } from "./webEngine"
import { encodeWebHash } from "./lockEditorUrl"
import { useWebSimulation } from "./useWebSimulation"

/** The designer's webs, by file name: `src/game/locks/wizard/*.web`. */
const WIZARD_WEBS: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob("../../game/locks/wizard/*.web", { query: "?raw", import: "default", eager: true }) as Record<
      string,
      string
    >
  ).map(([path, text]) => [path.slice(path.lastIndexOf("/") + 1), text])
)

// One worker for the page: the wizard floors are carved once, and reopening the editor finds them carved.
let shared: WebEngine | undefined
const sessionEngine = (): WebEngine => (shared ??= workerEngine())

const SAND = "repeating-linear-gradient(135deg, #d9a94f 0 4px, #4a3b20 4px 8px)"
const pct = (n: number) => Math.round(n)
const reportTone = (line: string) =>
  line.startsWith("✗") ? "text-red-300" : line.startsWith("⚠") ? "text-amber-300" : "text-white/80"
const chipTone: Record<ActivatorState, string> = {
  pulled: "border-emerald-400 text-emerald-300 line-through",
  reachable: "border-sky-400 text-sky-300",
  out: "border-white/20 text-white/50",
}

const Pin: FC<{ pin: SimPin; onPull: (name: string) => void }> = ({ pin, onPull }) => {
  const { t } = useTranslation()
  const shape = pin.look === "key" ? "rounded-md" : "rounded-full"
  const size = pin.side ? "top-4 size-5" : "top-1 size-6"
  const tone =
    pin.state === "pulled"
      ? "border-emerald-400 bg-emerald-500 text-neutral-900"
      : pin.state === "reachable"
        ? "border-sky-400 bg-neutral-900 text-sky-300 shadow-[0_0_0_4px_rgba(56,189,248,0.3)]"
        : "border-white/40 bg-neutral-900 text-white/50"
  const label = t(pin.look === "key" ? "devLockEditor.takePin" : "devLockEditor.pullPin", { name: pin.name })
  return (
    <button
      type="button"
      disabled={pin.state !== "reachable"}
      data-testid={`pin-${pin.name}`}
      onClick={() => onPull(pin.name)}
      aria-label={label}
      title={label}
      style={{ left: `${Math.min(Math.max(pin.pct, 2), 98)}%` }}
      className={`absolute grid -translate-x-1/2 place-items-center border-[1.5px] p-0 text-xs ${shape} ${size} ${tone} ${pin.fresh && pin.state === "reachable" ? "animate-web-pulse motion-reduce:animate-none" : ""}`}
    >
      <span
        className={`absolute left-1/2 -translate-x-1/2 font-mono text-[0.6rem] whitespace-nowrap ${pin.side ? "-bottom-4" : "-top-4"}`}
      >
        {pin.name}
      </span>
      {pin.state === "pulled" ? "✓" : pin.marks[0] ? <MarkChip mark={pin.marks[0]} size={pin.side ? 14 : 16} /> : "■"}
    </button>
  )
}

const statusText = (pyramid: SimPyramid, t: (key: string, options?: Record<string, unknown>) => string) =>
  pyramid.status.kind === "finishes"
    ? t("devLockEditor.finishes")
    : pyramid.status.kind === "stops"
      ? t("devLockEditor.stopsAt", { pct: pct(pyramid.status.pct) })
      : t("devLockEditor.notOpenYet")

const statusTone = { finishes: "text-emerald-300", stops: "text-amber-300", closed: "text-white/50" }

const PyramidRow: FC<{ pyramid: SimPyramid; onPull: (name: string) => void }> = ({ pyramid, onPull }) => {
  const { t } = useTranslation()
  const closed = pyramid.status.kind === "closed"
  return (
    <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1 sm:grid-cols-[3.5rem_minmax(0,1fr)_7rem]">
      <span className="font-mono text-xs text-white/60">{pyramid.name}</span>
      <div className="relative h-9" data-testid={`bar-${pyramid.name}`}>
        <div className="absolute inset-x-0 top-3.5 h-2 overflow-hidden rounded bg-white/15">
          <div
            className={`absolute inset-y-0 left-0 bg-sky-400 transition-[width] duration-500 motion-reduce:transition-none ${closed ? "opacity-20" : "opacity-60"}`}
            style={{ width: `${pyramid.cleared}%` }}
          />
          {pyramid.sandFrom !== undefined && (
            <div
              className="absolute inset-y-0 right-0 transition-[left] duration-500 motion-reduce:transition-none"
              style={{ left: `${pyramid.sandFrom}%`, background: SAND }}
            />
          )}
        </div>
        {pyramid.seals.map(seal => (
          <div
            key={`${seal.key}-${seal.where}`}
            title={`${seal.key} opens ${seal.where}`}
            className={`absolute w-[3px] -translate-x-1/2 rounded bg-rose-400 ${seal.side ? "top-3 h-4" : "top-1.5 h-6"} ${seal.open ? "opacity-25" : ""}`}
            style={{ left: `${seal.pct}%` }}
          />
        ))}
        {pyramid.pins.map(pin => (
          <Pin key={pin.name} pin={pin} onPull={onPull} />
        ))}
      </div>
      <span
        className={`col-start-2 justify-self-start rounded-full border px-2 text-xs font-semibold sm:col-start-3 ${statusTone[pyramid.status.kind]}`}
      >
        {statusText(pyramid, t)}
      </span>
      {(pyramid.fronts.length > 0 || pyramid.seals.length > 0) && (
        <ul className="col-start-2 font-mono text-[0.65rem] text-white/60">
          {pyramid.fronts.map(front => (
            <li key={front.pot} className="flex items-center gap-1">
              <MarkChip mark={front.mark} size={12} /> {front.pot}: {front.where}
            </li>
          ))}
          {pyramid.seals.map(seal => (
            <li key={`${seal.key}-${seal.where}`} className={seal.open ? "line-through" : ""}>
              {seal.key} opens {seal.where}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const JourneyBlock: FC<{ journey: SimJourney; onPull: (name: string) => void }> = ({ journey, onPull }) => {
  const { t } = useTranslation()
  return (
    <section
      aria-label={`wizard_${journey.journey}`}
      className="flex flex-col gap-3 rounded-lg border border-white/15 p-3"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/15 pb-1">
        <h4 className="font-bold">wizard_{journey.journey}</h4>
        <span
          className={`text-sm font-semibold tabular-nums ${journey.buried === undefined ? "text-emerald-300" : "text-amber-300"}`}
        >
          {journey.buried === undefined
            ? t("devLockEditor.nothingBuried")
            : t("devLockEditor.stillBuried", { percent: journey.buried })}
        </span>
      </div>
      {journey.pyramids.map(pyramid => (
        <PyramidRow key={pyramid.name} pyramid={pyramid} onPull={onPull} />
      ))}
    </section>
  )
}

const PotsPanel: FC<{ view: WebSimView }> = ({ view }) => {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-2">
      {view.pots.map(pot => (
        <div key={pot.name} className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <MarkChip mark={pot.mark} size={22} />
            <span className="font-semibold">{pot.name}</span>
            <span className="text-xs text-white/60">
              {pot.front === undefined
                ? t("devLockEditor.potOpen", { pulled: pot.pulled, total: pot.levers.length })
                : t("devLockEditor.potFront", { pulled: pot.pulled, total: pot.levers.length, pct: pct(pot.front) })}
            </span>
          </div>
          {pot.where && <span className="font-mono text-[0.65rem] text-white/60">{pot.where}</span>}
          <div className="flex flex-wrap gap-1">
            {pot.levers.map(lever => (
              <span key={lever.name} className={`rounded-full border px-2 font-mono text-xs ${chipTone[lever.state]}`}>
                {lever.name}
              </span>
            ))}
          </div>
        </div>
      ))}
      {view.keys.length > 0 && (
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-semibold">■ {t("devLockEditor.keys")}</span>
            <span className="text-xs text-white/60">{t("devLockEditor.keysNote")}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {view.keys.map(key => (
              <span key={key.name} className={`rounded-full border px-2 font-mono text-xs ${chipTone[key.state]}`}>
                {key.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const LogLine: FC<{ entry: WebSimPull }> = ({ entry }) => {
  const { t } = useTranslation()
  const effects = [
    ...entry.pots.map(pot =>
      pot.front === undefined
        ? t("devLockEditor.logPotOpen", { pot: pot.pot })
        : t("devLockEditor.logFront", { pot: pot.pot, pct: pct(pot.front) })
    ),
    ...entry.seals.map(at => t("devLockEditor.logSeal", { at })),
  ]
  return (
    <li>
      {t(entry.look === "key" ? "devLockEditor.logTake" : "devLockEditor.logPull", { name: entry.name, at: entry.at })}
      {effects.length > 0 && ` → ${effects.join(", ")}`}
      {entry.fresh.length > 0 && (
        <span className="text-white/60"> · {t("devLockEditor.logNew", { names: entry.fresh.join(", ") })}</span>
      )}
    </li>
  )
}

const WebSyntax: FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("devLockEditor.syntax")}
        className="relative flex max-h-full w-full max-w-2xl flex-col gap-3 rounded-lg border border-red-400 bg-neutral-900 p-3 text-white shadow-xl"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold tracking-wide text-red-300 uppercase">{t("devLockEditor.syntax")}</h2>
          <DeveloperButton label={t("devLockEditor.close")} onClick={onClose} />
        </div>
        <pre className="overflow-auto font-mono text-xs whitespace-pre-wrap">{WEB_SYNTAX}</pre>
      </div>
    </div>
  )
}

/** The web mode: a `.web` checked against the last bake as `yarn lock <web>` checks it, and its pulls played through
 * on the walk that check made. The editor keeps the text, so switching modes keeps it. `engine` stands in for the
 * worker in a story or a test. */
export const WebMode: FC<{ text: string; onText: (text: string) => void; engine?: WebEngine }> = ({
  text,
  onText,
  engine: given,
}) => {
  const { t } = useTranslation()
  const [name, setName] = useState("editor.web")
  const [helping, setHelping] = useState(false)
  const [copied, setCopied] = useState<"copied" | "failed" | null>(null)
  const engine = given ?? sessionEngine()
  const sim = useWebSimulation(engine, text, name)
  const { view, state, report } = sim

  const edit = (next: string) => {
    onText(next)
    setCopied(null)
    window.history.replaceState(null, "", encodeWebHash(next))
  }
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}${encodeWebHash(text)}`)
      setCopied("copied")
    } catch {
      setCopied("failed")
    }
  }
  const files = Object.keys(WIZARD_WEBS)

  return (
    <>
      {helping && <WebSyntax onClose={() => setHelping(false)} />}
      <div className="flex flex-wrap items-center gap-2">
        <DeveloperButton label={t("devLockEditor.syntax")} onClick={() => setHelping(true)} />
        {files.length > 0 && (
          <select
            aria-label={t("devLockEditor.openWeb")}
            value=""
            onChange={e => {
              setName(e.target.value)
              edit(WIZARD_WEBS[e.target.value])
            }}
            className="rounded-md border border-red-400 bg-stone-950 p-2 text-sm"
          >
            <option value="" disabled>
              {t("devLockEditor.openWeb")}
            </option>
            {files.map(file => (
              <option key={file} value={file}>
                {file}
              </option>
            ))}
          </select>
        )}
      </div>
      <textarea
        aria-label={t("devLockEditor.webNotation")}
        value={text}
        onChange={e => edit(e.target.value)}
        rows={10}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className="w-full shrink-0 rounded-md border border-red-400 bg-stone-950 p-2 font-mono text-base text-white"
      />
      <div className="flex flex-wrap items-center gap-2">
        <DeveloperButton label={t("devLockEditor.copyLink")} onClick={copyLink} />
        {copied && <span className="text-sm text-white/80">{t(`devLockEditor.${copied}`)}</span>}
        <span role="status" className="text-sm text-white/60">
          {sim.checking
            ? t("devLockEditor.checking")
            : report &&
              [
                t("devLockEditor.checkedIn", { ms: report.ms }),
                ...(report.worldMs !== undefined ? [t("devLockEditor.worldCarved", { ms: report.worldMs })] : []),
              ].join(" · ")}
        </span>
      </div>

      <section aria-label={t("devLockEditor.simulation")} className="flex flex-col gap-3">
        <h3 className="text-xs font-bold text-white/60 uppercase">{t("devLockEditor.simulation")}</h3>
        {view && state ? (
          <>
            <PotsPanel view={view} />
            <div className="flex flex-wrap items-center gap-2">
              <DeveloperButton label={t("devLockEditor.pullAll")} onClick={sim.pullAll} />
              <DeveloperButton label={t("devLockEditor.reset")} onClick={sim.reset} />
              <span className="text-sm text-white/60">
                {state.pulled.length === view.total
                  ? t("devLockEditor.allTaken")
                  : t("devLockEditor.progress", {
                      reachable: view.reachable.length,
                      pulled: state.pulled.length,
                      total: view.total,
                    })}
              </span>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-white/60" aria-hidden="true">
              <span className="flex items-center gap-1">
                <i className="inline-block h-2 w-4 rounded bg-sky-400/60" />
                {t("devLockEditor.legendCleared")}
              </span>
              <span className="flex items-center gap-1">
                <i className="inline-block h-2 w-4 rounded" style={{ background: SAND }} />
                {t("devLockEditor.legendBuried")}
              </span>
              <span className="flex items-center gap-1">
                <i className="inline-block h-3 w-[3px] rounded bg-rose-400" />
                {t("devLockEditor.legendSeal")}
              </span>
              <span>{t("devLockEditor.legendPins")}</span>
            </div>
            {view.journeys.map(journey => (
              <JourneyBlock key={journey.journey} journey={journey} onPull={sim.pull} />
            ))}
            <section aria-label={t("devLockEditor.log")}>
              <h3 className="mb-1 text-xs font-bold text-white/60 uppercase">{t("devLockEditor.log")}</h3>
              {state.log.length === 0 ? (
                <p className="text-sm text-white/60">{t("devLockEditor.logEmpty")}</p>
              ) : (
                <ol className="list-decimal pl-6 text-sm">
                  {state.log.map(entry => (
                    <LogLine key={entry.name} entry={entry} />
                  ))}
                </ol>
              )}
            </section>
          </>
        ) : (
          <p className="text-sm text-white/60">{t("devLockEditor.noSimulation")}</p>
        )}
      </section>

      <section aria-label={t("devLockEditor.summary")}>
        <h3 className="mb-1 text-xs font-bold text-white/60 uppercase">{t("devLockEditor.summary")}</h3>
        {sim.error && <p className="font-mono text-sm text-red-300">✗ {sim.error}</p>}
        {report && (
          <pre className="overflow-x-auto rounded-md bg-stone-950 p-2 font-mono text-xs">
            {report.text.split("\n").map((line, i) => (
              <div key={i} className={reportTone(line)}>
                {line || " "}
              </div>
            ))}
          </pre>
        )}
      </section>
    </>
  )
}
