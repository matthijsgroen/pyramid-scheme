import { type FC, type KeyboardEvent, useCallback, useEffect, useRef, useState } from "react"

export type CollectionTab = { id: string; label: string }

export type CollectionTabsProps = {
  tabs: CollectionTab[]
  selected: string
  onSelect: (id: string) => void
  /** What the row of tabs is called, for a screen reader. */
  label: string
  /** The id of the tabpanel the tabs control. */
  panelId: string
}

// A row of tabs that scrolls sideways when they do not fit; the selected one is dark. The arrow keys move
// to the neighbour (wrapping) and select it, Home and End jump to the ends. When the row overflows, an arrow
// stands at each end and lights up while there is more to see that way; tapping it scrolls the row. The
// arrows are for pointers only: the keyboard already moves through the tabs.
export const CollectionTabs: FC<CollectionTabsProps> = ({ tabs, selected, onSelect, label, panelId }) => {
  const rowRef = useRef<HTMLDivElement>(null)
  const [more, setMore] = useState({ left: false, right: false })
  const measure = useCallback(() => {
    const row = rowRef.current
    if (!row) return
    setMore({ left: row.scrollLeft > 0, right: row.scrollLeft + row.clientWidth < row.scrollWidth - 1 })
  }, [])
  useEffect(() => {
    const row = rowRef.current
    if (!row) return
    measure()
    if (typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(measure)
    observer.observe(row)
    return () => observer.disconnect()
  }, [measure, tabs.length])

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const index = tabs.findIndex(tab => tab.id === selected)
    const target =
      event.key === "ArrowRight"
        ? (index + 1) % tabs.length
        : event.key === "ArrowLeft"
          ? (index - 1 + tabs.length) % tabs.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? tabs.length - 1
              : undefined
    if (target === undefined || tabs.length === 0) return
    event.preventDefault()
    onSelect(tabs[target].id)
    event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')[target]?.focus()
  }

  const overflows = more.left || more.right
  const arrow = (direction: 1 | -1, lit: boolean) => (
    <button
      type="button"
      aria-hidden
      tabIndex={-1}
      onClick={() => {
        const row = rowRef.current
        row?.scrollBy({ left: direction * row.clientWidth * 0.7, behavior: "smooth" })
      }}
      className={`flex w-7 shrink-0 items-center justify-center text-xl font-extrabold transition-opacity ${lit ? "" : "pointer-events-none opacity-25"}`}
    >
      {direction === 1 ? "›" : "‹"}
    </button>
  )

  return (
    <div className="flex items-stretch rounded-xl bg-[#E9DCBF] text-[#2B2118]">
      {overflows && arrow(-1, more.left)}
      <div
        ref={rowRef}
        onScroll={measure}
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto p-1"
      >
        {tabs.map(tab => {
          const active = tab.id === selected
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${panelId}-tab-${tab.id}`}
              aria-selected={active}
              aria-controls={panelId}
              tabIndex={active ? 0 : -1}
              onClick={() => onSelect(tab.id)}
              className={`h-11 flex-1 shrink-0 rounded-[9px] px-3 text-[13px] font-extrabold whitespace-nowrap ${active ? "bg-[#2B2118] text-[#FFF8EA]" : "bg-transparent"}`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      {overflows && arrow(1, more.right)}
    </div>
  )
}
