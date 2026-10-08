import type { FC } from "react"

// Why the explorer stopped, said where a prompt would stand. The live region is its container (SiteMapView), which
// stands in the page before there is anything to say. A remark, not a button: there is nothing to take, and
// the player simply moves on; the next tap on the map clears it.
export const MapNotice: FC<{ label: string }> = ({ label }) => (
  <p className="m-0 rounded-full border border-stone-500/70 bg-stone-900/90 px-3 py-1 text-xs whitespace-nowrap text-stone-200 italic shadow-lg">
    {label}
  </p>
)
