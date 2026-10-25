import type { FC } from "react"
import { NoticeDot } from "@/ui/atoms/NoticeDot"

export type TierHeaderProps = {
  title: string
  /** "1 van 5 klaar" */
  progress: string
  /** With it the header is a button that folds the tier's rows. */
  collapsible?: { open: boolean; onToggle: () => void; label: string }
  dot?: boolean
  dotLabel?: string
}

const BASE =
  "flex w-full items-center gap-2 py-0.5 text-left text-xs font-extrabold tracking-widest text-[#5C4A36] uppercase"

// The divider over a tier's rows: its name, a line, how far it is. A tier that can be folded is one button
// with a chevron; the dot there tells there is news inside while it is shut.
export const TierHeader: FC<TierHeaderProps> = ({ title, progress, collapsible, dot, dotLabel }) => {
  const rest = (
    <>
      <span>{title}</span>
      <span className="h-px flex-1 bg-[#C9B48E]" />
      <span className="font-semibold tracking-normal normal-case">{progress}</span>
      {dot && <NoticeDot label={dotLabel} />}
    </>
  )
  if (!collapsible) return <div className={BASE}>{rest}</div>
  return (
    <button
      type="button"
      aria-expanded={collapsible.open}
      onClick={collapsible.onToggle}
      className={`${BASE} mt-1.5 min-h-11`}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        aria-hidden
        className={`shrink-0 ${collapsible.open ? "rotate-90" : ""}`}
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
      {rest}
      <span className="sr-only">{collapsible.label}</span>
    </button>
  )
}
