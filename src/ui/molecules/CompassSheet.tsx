import type { FC } from "react"
import type { CompassAccess } from "@/game/siteTypes"

export type CompassGlyph = { id: string; symbol: string; progress: string }
export type CompassRow = { key: string; label: string; access: CompassAccess }

export type CompassSheetProps = {
  parts: { held: number; total: number }
  /** "2 of 3 parts · sees the floor". */
  partsLabel: string
  pickHeading: string
  onlyIncomplete: string
  glyphs: readonly CompassGlyph[]
  picked: string | null
  onPick: (id: string) => void
  /** Heads the list of where the picked sign's pieces lie. */
  whereHeading: string
  pickFirst: string
  nothingToFind: string
  /** Shown when the picked sign has no piece the player can reach on a floor they have been to. */
  noneInReach: string
  rows: readonly CompassRow[]
  accessLabels: Record<CompassAccess, string>
  followLabel: string
  followingLabel: string
  following: boolean
  onFollow: () => void
}

// Only the blockers get a mark: a bare row means nothing known stands in the way.
const ACCESS_MARK: Record<CompassAccess, string> = { open: "", unknown: "❓" }

/** The compass at the camp's map table: pick a sign that is not complete, see where its pieces lie, follow it. */
export const CompassSheet: FC<CompassSheetProps> = ({
  parts,
  partsLabel,
  pickHeading,
  onlyIncomplete,
  glyphs,
  picked,
  onPick,
  whereHeading,
  pickFirst,
  nothingToFind,
  noneInReach,
  rows,
  accessLabels,
  followLabel,
  followingLabel,
  following,
  onFollow,
}) => (
  <div className="flex flex-col gap-4 p-2 text-camp-ink">
    <div className="flex items-center gap-1.5 text-sm text-camp-label">
      {Array.from({ length: parts.total }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className={
            i < parts.held
              ? "size-3.5 rounded-[3px] bg-camp-accent"
              : "box-border size-3.5 rounded-[3px] border-2 border-dashed border-camp-dashed"
          }
        />
      ))}
      <span className="ml-1">{partsLabel}</span>
    </div>

    {glyphs.length === 0 ? (
      <p className="text-camp-muted">{nothingToFind}</p>
    ) : (
      <>
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{pickHeading}</h3>
          <div className="grid grid-cols-4 gap-2">
            {glyphs.map(glyph => (
              <button
                key={glyph.id}
                type="button"
                aria-pressed={glyph.id === picked}
                onClick={() => onPick(glyph.id)}
                className={`flex h-18 flex-col items-center justify-center gap-1 rounded-xl border-2 ${
                  glyph.id === picked ? "border-camp-accent bg-camp-chip" : "border-transparent bg-camp-card"
                }`}
              >
                <span className="text-3xl leading-none">{glyph.symbol}</span>
                <span className="text-xs text-camp-label">{glyph.progress}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-camp-label">{onlyIncomplete}</p>
        </section>

        <section className="flex flex-col gap-2">
          {picked === null ? (
            <p className="text-sm text-camp-muted">{pickFirst}</p>
          ) : (
            <>
              <h3 className="text-sm font-semibold">{whereHeading}</h3>
              {rows.length === 0 && <p className="text-sm text-camp-muted">{noneInReach}</p>}
              <ul className="flex flex-col gap-2">
                {rows.map(row => (
                  <li key={row.key} className="flex items-center gap-2 rounded-xl bg-camp-card px-3 py-2.5">
                    <span className="flex-1 truncate">{row.label}</span>
                    {ACCESS_MARK[row.access] && (
                      <span title={accessLabels[row.access]} aria-label={accessLabels[row.access]}>
                        {ACCESS_MARK[row.access]}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={following}
                onClick={onFollow}
                className="h-12 rounded-xl bg-camp-accent font-semibold text-camp-on-accent hover:bg-camp-accent-hover disabled:bg-camp-chip disabled:text-camp-ink-soft"
              >
                {following ? followingLabel : followLabel}
              </button>
            </>
          )}
        </section>
      </>
    )}
  </div>
)
