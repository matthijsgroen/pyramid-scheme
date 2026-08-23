import type { FC, PropsWithChildren } from "react"
import clsx from "clsx"

// Grid for a Collection category. Auto-fits as many fixed-width (3rem) tiles as the width allows
// — equal columns, so inter-tile spacing is consistent and it works at any screen size without
// breakpoint guessing. `density` is the only knob: it sets the gap between tiles.
type Density = "comfortable" | "compact"

const gapClasses: Record<Density, string> = {
  comfortable: "gap-5",
  compact: "gap-1",
}

export const CategoryGrid: FC<PropsWithChildren<{ density?: Density }>> = ({ density = "comfortable", children }) => (
  <div className={clsx("grid grid-cols-[repeat(auto-fill,minmax(3rem,1fr))]", gapClasses[density])}>{children}</div>
)
