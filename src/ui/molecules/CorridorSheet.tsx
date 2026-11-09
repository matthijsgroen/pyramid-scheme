import type { FC } from "react"

export type CorridorSheetProps = {
  parts: { held: number; total: number }
  /** "2 of 4 parts · hears this whole floor". */
  partsLabel: string
  /** What it does inside a pyramid. */
  inPyramid: string
  /** What the next parts bring, while there are any to find. */
  next?: string
  /** With every part: the journeys been to where a corridor is still closed. Absent below that. */
  journeys?: { heading: string; none: string; rows: readonly { key: string; label: string; detail: string }[] }
}

/** The corridor finder at the camp's map table: how far it hears, near to far. */
export const CorridorSheet: FC<CorridorSheetProps> = ({ parts, partsLabel, inPyramid, next, journeys }) => (
  <div className="flex flex-col gap-3 p-2 text-camp-ink">
    <div className="flex items-center gap-1.5 text-sm text-camp-label">
      {Array.from({ length: parts.total }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className={
            i < parts.held
              ? "size-3.5 rounded-[3px] bg-camp-select"
              : "box-border size-3.5 rounded-[3px] border-2 border-dashed border-camp-dashed"
          }
        />
      ))}
      <span className="ml-1">{partsLabel}</span>
    </div>
    <p>{inPyramid}</p>
    {next && <p className="text-sm text-camp-label">{next}</p>}
    {journeys && (
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">{journeys.heading}</h3>
        {journeys.rows.length === 0 ? (
          <p className="text-sm text-camp-muted">{journeys.none}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {journeys.rows.map(row => (
              <li key={row.key} className="flex flex-col rounded-xl bg-camp-card px-3 py-2.5">
                <span className="font-semibold">{row.label}</span>
                <span className="text-sm text-camp-label">{row.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    )}
  </div>
)
