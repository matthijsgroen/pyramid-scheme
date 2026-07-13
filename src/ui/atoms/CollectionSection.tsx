import type { FC, PropsWithChildren } from "react"

// A titled Collection category block: the accented gradient-clipped heading + its spacing wrapper.
// `accent` picks the heading hue; full class strings are listed (not interpolated) so Tailwind's
// JIT keeps them.
type Accent = "purple" | "amber" | "emerald"

const accentClasses: Record<Accent, string> = {
  purple: "border-b-purple-800 bg-purple-800",
  amber: "border-b-amber-800 bg-amber-800",
  emerald: "border-b-emerald-800 bg-emerald-800",
}

export const CollectionSection: FC<PropsWithChildren<{ title: string; accent: Accent }>> = ({
  title,
  accent,
  children,
}) => (
  <div className="mb-8">
    <h2
      className={`mb-4 border-2 bg-clip-text font-pyramid text-xl font-semibold text-transparent ${accentClasses[accent]}`}
    >
      {title}
    </h2>
    {children}
  </div>
)
