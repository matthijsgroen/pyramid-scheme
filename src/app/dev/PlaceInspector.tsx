import type { FC } from "react"
import { useTranslation } from "react-i18next"
import type { PlaceDef, PlaceKind } from "@/game/prefabTypes"
import { DeveloperButton } from "@/ui/atoms/DeveloperButton"

type Props = {
  place: PlaceDef
  /** The kinds that fit the place's layer and footprint, the ones it already lists among them. */
  fitting: readonly PlaceKind[]
  /** The other places' letters, for "per". */
  letters: readonly string[]
  /** How many objects of the place the layout draws: the "of" a new count starts with. */
  drawn: number
  onChange: (patch: Partial<Pick<PlaceDef, "optional" | "kinds" | "group">>) => void
  onDrawAnother: () => void
  onClose: () => void
}

const field = "w-14 rounded-md border border-red-400 bg-stone-950 p-1 text-sm text-white"

// One place's options: optional, the kinds it may hold, and how many of its objects are filled.
export const PlaceInspector: FC<Props> = ({ place, fitting, letters, drawn, onChange, onDrawAnother, onClose }) => {
  const { t } = useTranslation()
  const { group } = place
  const toggleKind = (kind: PlaceKind) => {
    const kinds = place.kinds.includes(kind) ? place.kinds.filter(k => k !== kind) : [...place.kinds, kind]
    if (kinds.length > 0) onChange({ kinds })
  }
  return (
    <section
      aria-label={t("devRoomEditor.inspector.title", { letter: place.letter })}
      className="flex flex-col gap-2 rounded-md border border-white/20 p-2 text-sm"
    >
      <h3 className="text-xs font-bold text-white/60 uppercase">
        {t("devRoomEditor.inspector.title", { letter: place.letter })} · {place.layer} {place.cols}x{place.rows}
      </h3>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={place.optional} onChange={e => onChange({ optional: e.target.checked })} />
        {t("devRoomEditor.inspector.optional")}
      </label>
      <fieldset className="flex flex-wrap gap-x-3 gap-y-1">
        <legend className="text-xs text-white/60">{t("devRoomEditor.inspector.kinds")}</legend>
        {fitting.map(kind => (
          <label key={kind} className="flex items-center gap-1">
            <input type="checkbox" checked={place.kinds.includes(kind)} onChange={() => toggleKind(kind)} />
            {kind}
          </label>
        ))}
      </fieldset>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={group !== undefined}
          onChange={e => onChange({ group: e.target.checked ? { take: 1, of: Math.max(drawn, 1) } : undefined })}
        />
        {t("devRoomEditor.inspector.counted")}
      </label>
      {group && (
        <div className="flex flex-wrap items-center gap-2">
          {t("devRoomEditor.inspector.take")}
          <input
            type="number"
            min={1}
            aria-label={t("devRoomEditor.inspector.take")}
            value={group.take}
            onChange={e => onChange({ group: { ...group, take: Number(e.target.value) || 1 } })}
            className={field}
          />
          {t("devRoomEditor.inspector.of")}
          <input
            type="number"
            min={1}
            aria-label={t("devRoomEditor.inspector.of")}
            value={group.of}
            onChange={e => onChange({ group: { ...group, of: Number(e.target.value) || 1 } })}
            className={field}
          />
          {t("devRoomEditor.inspector.per")}
          <select
            aria-label={t("devRoomEditor.inspector.per")}
            value={group.per ?? ""}
            onChange={e =>
              onChange({
                group: { take: group.take, of: group.of, ...(e.target.value ? { per: e.target.value } : {}) },
              })
            }
            className="rounded-md border border-red-400 bg-stone-950 p-1 text-sm text-white"
          >
            <option value="">{t("devRoomEditor.inspector.perNone")}</option>
            {letters.map(letter => (
              <option key={letter} value={letter}>
                {letter}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="flex gap-2">
        <DeveloperButton label={t("devRoomEditor.inspector.drawAnother")} onClick={onDrawAnother} />
        <DeveloperButton label={t("devRoomEditor.inspector.close")} onClick={onClose} />
      </div>
    </section>
  )
}
