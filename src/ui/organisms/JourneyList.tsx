import type { FC, ReactNode } from "react"

export type JourneyListGroup = {
  key: string
  header: ReactNode
  rows: ReactNode[]
  /** A shut group shows its header only. */
  open: boolean
}

export type JourneyListProps = {
  groups: JourneyListGroup[]
  footer?: ReactNode
  /** Shown instead of the groups when there are none. */
  emptyText?: string
}

// The scrolling flat list of every journey: a header per tier, its rows under it, a note at the bottom.
export const JourneyList: FC<JourneyListProps> = ({ groups, footer, emptyText }) => (
  <div className="flex min-h-full flex-col gap-2 text-camp-ink">
    {groups.length === 0 && emptyText && <p className="text-[15px] text-camp-ink-soft">{emptyText}</p>}
    {groups.map(group => (
      <section key={group.key} className="flex flex-col gap-2">
        {group.header}
        {group.open && (
          <ul className="flex flex-col gap-2">
            {group.rows.map((row, index) => (
              <li key={index}>{row}</li>
            ))}
          </ul>
        )}
      </section>
    ))}
    {footer && <div className="mt-auto pt-2">{footer}</div>}
  </div>
)
