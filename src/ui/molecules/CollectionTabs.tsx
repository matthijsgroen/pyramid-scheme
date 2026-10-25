import type { FC, KeyboardEvent } from "react"

export type CollectionTab = { id: string; label: string }

export type CollectionTabsProps = {
  tabs: CollectionTab[]
  selected: string
  onSelect: (id: string) => void
  /** The id of the tabpanel the tabs control. */
  panelId: string
}

// A row of tabs that scrolls sideways when they do not fit; the selected one is dark. The arrow keys move
// to the neighbour (wrapping) and select it, Home and End jump to the ends.
export const CollectionTabs: FC<CollectionTabsProps> = ({ tabs, selected, onSelect, panelId }) => {
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
  return (
    <div
      role="tablist"
      onKeyDown={onKeyDown}
      className="flex gap-1.5 overflow-x-auto rounded-xl bg-[#E9DCBF] p-1 text-[#2B2118]"
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
  )
}
