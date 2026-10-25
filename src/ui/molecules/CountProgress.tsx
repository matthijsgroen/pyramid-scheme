import type { FC } from "react"

export type CountProgressProps = {
  label: string
  note?: string
  value: number
  max: number
}

// "61 van 252 stukjes" in bold, a muted note on the right and the bar below it.
export const CountProgress: FC<CountProgressProps> = ({ label, note, value, max }) => {
  const share = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div className="flex flex-col gap-2 text-[#2B2118]">
      <div className="flex items-center justify-between gap-3 text-[15px]">
        <span className="font-extrabold">{label}</span>
        {note && <span className="text-[#5C4A36]">{note}</span>}
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className="h-2.5 overflow-hidden rounded-full bg-[#E9DCBF]"
      >
        <div className="h-full bg-[#A3401A]" style={{ width: `${share}%` }} />
      </div>
    </div>
  )
}
