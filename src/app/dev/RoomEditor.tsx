import { useMemo, useState, type FC } from "react"
import { useTranslation } from "react-i18next"
import { difficulties } from "@/data/difficultyLevels"
import { prefabFaults, variantsOf } from "@/game/prefabChecks"
import { parsePrefab } from "@/game/prefabNotation"
import type { Prefab } from "@/game/prefabTypes"
import type { Direction, Tileset } from "@/game/siteTypes"
import { prefabChoices } from "@/app/SiteMap/prefabPreviewFloor"
import { PrefabRoomPreview } from "@/app/SiteMap/PrefabRoomPreview"
import { addLegendLine, roomPalette } from "@/app/SiteMap/roomPalette"
import { DeveloperButton } from "@/ui/atoms/DeveloperButton"
import { encodeRoomHash, initialRoomText } from "./roomEditorUrl"

const TIERS: readonly Tileset[] = [...difficulties, "cave", "sphinx"]
const DIRECTIONS: readonly Direction[] = ["n", "e", "s", "w"]

// The browser reads no folder: the catalogued rooms come in through the bundler.
const CATALOGUE: Record<string, string> = {}
for (const [path, text] of Object.entries(
  import.meta.glob("../../game/rooms/**/*.room", { query: "?raw", import: "default", eager: true }) as Record<
    string,
    string
  >
)) {
  if (path.endsWith("-blocked.room")) continue
  CATALOGUE[path.slice(path.lastIndexOf("/") + 1, -".room".length)] = text
}

type Parsed = { prefab: Prefab; faults: string[] } | { error: string }

const parse = (text: string): Parsed => {
  try {
    const prefab = parsePrefab(text)
    return { prefab, faults: prefabFaults(prefab) }
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
}

const Select: FC<{
  label: string
  value: string
  options: readonly { value: string; label: string }[]
  onChange: (value: string) => void
}> = ({ label, value, options, onChange }) => (
  <label className="flex flex-col gap-1 text-xs text-white/60">
    {label}
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="rounded-md border border-red-400 bg-stone-950 p-1 text-sm text-white"
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
)

// Designing a room: its text, the checks, and the room drawn with a tier's art. The text lives in the URL hash, so a
// copied link reproduces the room; the designer pastes the text into src/game/rooms/<tier>/<name>.room.
export const RoomEditor: FC<{ initialText?: string; onClose?: () => void }> = ({
  initialText = initialRoomText(window.location.hash),
  onClose,
}) => {
  const { t } = useTranslation()
  const [text, setText] = useState(initialText)
  const [picked, setPicked] = useState<Tileset | null>(null)
  const [variant, setVariant] = useState(0)
  const [fill, setFill] = useState(0)
  const [from, setFrom] = useState<Direction | undefined>()
  const [to, setTo] = useState<Direction | undefined>()
  const [copied, setCopied] = useState<"copied" | "failed" | null>(null)
  const parsed = useMemo(() => parse(text), [text])
  const prefab = "prefab" in parsed ? parsed.prefab : undefined
  const tier: Tileset = picked ?? prefab?.tier ?? "starter"
  const palette = useMemo(() => roomPalette(tier), [tier])

  const variants = useMemo(() => (prefab ? variantsOf(prefab) : []), [prefab])
  const shownVariant = Math.min(variant, Math.max(variants.length - 1, 0))
  const fills = prefab ? prefabChoices(prefab, shownVariant).fills : 0
  const shownFill = Math.min(fill, Math.max(fills - 1, 0))
  const tierFault =
    prefab && prefab.tier !== tier ? t("devRoomEditor.tierDisagrees", { header: prefab.tier, picked: tier }) : null
  const faults = !prefab ? [] : [...(tierFault ? [tierFault] : []), ...("faults" in parsed ? parsed.faults : [])]

  const edit = (next: string) => {
    setText(next)
    setCopied(null)
    window.history.replaceState(null, "", encodeRoomHash(next))
  }
  const copy = async (what: string) => {
    try {
      await navigator.clipboard.writeText(what)
      setCopied("copied")
    } catch {
      setCopied("failed")
    }
  }
  const directionOptions = [
    { value: "", label: t("devRoomEditor.automatic") },
    ...DIRECTIONS.map(dir => ({ value: dir, label: t(`devRoomEditor.direction.${dir}`) })),
  ]
  const catalogued = Object.keys(CATALOGUE)

  return (
    <div className="flex h-(--screen-height) flex-col gap-3 overflow-y-auto bg-neutral-900 p-4 text-white">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold tracking-wide text-red-300 uppercase">{t("devRoomEditor.title")}</h2>
        <div className="flex flex-wrap items-end gap-2">
          <Select
            label={t("devRoomEditor.tier")}
            value={tier}
            options={TIERS.map(value => ({ value, label: value }))}
            onChange={value => setPicked(value as Tileset)}
          />
          {catalogued.length > 0 && (
            <Select
              label={t("devRoomEditor.catalogue")}
              value=""
              options={[{ value: "", label: "…" }, ...catalogued.map(name => ({ value: name, label: name }))]}
              onChange={name => name && edit(CATALOGUE[name])}
            />
          )}
          {onClose && <DeveloperButton label={t("devRoomEditor.close")} onClick={onClose} />}
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <textarea
            aria-label={t("devRoomEditor.notation")}
            value={text}
            onChange={e => edit(e.target.value)}
            rows={16}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="w-full rounded-md border border-red-400 bg-stone-950 p-2 font-mono text-base text-white"
          />
          <div className="flex flex-wrap items-center gap-2">
            <DeveloperButton
              label={t("devRoomEditor.copyLink")}
              onClick={() => copy(`${window.location.origin}${window.location.pathname}${encodeRoomHash(text)}`)}
            />
            <DeveloperButton label={t("devRoomEditor.copyText")} onClick={() => copy(text)} />
            {copied && (
              <span role="status" className="text-sm text-white/80">
                {t(`devRoomEditor.${copied}`)}
              </span>
            )}
          </div>
          <section aria-label={t("devRoomEditor.palette")}>
            <h3 className="mb-1 text-xs font-bold text-white/60 uppercase">{t("devRoomEditor.palette")}</h3>
            <ul className="flex flex-wrap gap-2">
              {palette.map(entry => (
                <li key={entry.kind}>
                  <button
                    type="button"
                    onClick={() => edit(addLegendLine(text, entry))}
                    title={`${entry.layer} ${entry.cols}x${entry.rows}${entry.painted ? "" : ` (${t("devRoomEditor.unpainted")})`}`}
                    className={`flex w-20 flex-col items-center gap-1 rounded-md border border-white/20 p-1 text-xs ${entry.painted ? "" : "opacity-50 grayscale"}`}
                  >
                    {entry.url && <img src={entry.url} alt="" className="size-10 object-contain" />}
                    <span className="break-all">{entry.kind}</span>
                    <span className="text-white/60">
                      {entry.cols}x{entry.rows}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <div className="flex flex-col gap-3">
          {prefab && (
            <div className="flex flex-wrap gap-2">
              <Select
                label={t("devRoomEditor.layout")}
                value={String(shownVariant)}
                options={variants.map((v, i) => ({
                  value: String(i),
                  label: `${prefab.layouts[v.layout].name || v.layout + 1}${v.mirrored ? ` ${t("devRoomEditor.mirrored")}` : ""}`,
                }))}
                onChange={value => setVariant(Number(value))}
              />
              <label className="flex flex-col gap-1 text-xs text-white/60">
                {t("devRoomEditor.fill", { count: fills })}
                <input
                  type="number"
                  min={0}
                  max={Math.max(fills - 1, 0)}
                  value={shownFill}
                  onChange={e => setFill(Math.max(0, Number(e.target.value) || 0))}
                  className="w-20 rounded-md border border-red-400 bg-stone-950 p-1 text-sm text-white"
                />
              </label>
              <Select
                label={t("devRoomEditor.fromDoor")}
                value={from ?? ""}
                options={directionOptions}
                onChange={value => setFrom((value || undefined) as Direction | undefined)}
              />
              <Select
                label={t("devRoomEditor.toDoor")}
                value={to ?? ""}
                options={directionOptions}
                onChange={value => setTo((value || undefined) as Direction | undefined)}
              />
            </div>
          )}
          {prefab && (
            <PrefabRoomPreview
              prefab={prefab}
              tileset={tier}
              variant={shownVariant}
              fill={shownFill}
              from={from}
              to={to}
              className="h-96 w-full"
            />
          )}
          <section aria-label={t("devRoomEditor.checks")}>
            <h3 className="mb-1 text-xs font-bold text-white/60 uppercase">{t("devRoomEditor.checks")}</h3>
            <ul className="font-mono text-sm">
              {"error" in parsed && <li className="text-red-300">✗ {parsed.error}</li>}
              {faults.map(fault => (
                <li key={fault} className="text-amber-300">
                  ⚠ {fault}
                </li>
              ))}
              {prefab && faults.length === 0 && <li className="text-white/80">✓ {t("devRoomEditor.sound")}</li>}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
