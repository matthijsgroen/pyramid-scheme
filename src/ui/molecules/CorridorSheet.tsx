import type { FC } from "react"

export type CorridorSheetProps = {
  parts: { held: number; total: number }
  /** "2 of 4 parts · hears this whole floor". */
  partsLabel: string
  /** What it does inside a pyramid. */
  inPyramid: string
  /** What the next parts bring, while there are any to find. */
  next?: string
}

/** The corridor finder at the camp's map table: how far it hears, near to far. */
export const CorridorSheet: FC<CorridorSheetProps> = ({ parts, partsLabel, inPyramid, next }) => (
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
  </div>
)
