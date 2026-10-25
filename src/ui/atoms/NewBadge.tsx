import type { FC } from "react"

// The small accent pill that marks something the player has not seen yet. Where it sits is the
// caller's: wrap it in a positioned element.
export const NewBadge: FC<{ label: string; className?: string }> = ({ label, className = "" }) => (
  <span className={`rounded-full bg-[#A3401A] px-1.5 py-px text-[10px] font-extrabold text-[#FFF8EA] ${className}`}>
    {label}
  </span>
)
