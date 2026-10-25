import type { FC, ReactNode } from "react"

export type HaulRowProps = {
  /** The picture on the left: an image, an icon or a small made grid. */
  visual: ReactNode
  title: string
  note?: string
  badge?: string
}

// One line of the haul brought home.
export const HaulRow: FC<HaulRowProps> = ({ visual, title, note, badge }) => (
  <div className="flex items-center gap-3 rounded-[10px] border-2 border-transparent bg-[#F4EAD5] p-2.5 text-[#2B2118] lg:border-[#D6C4A0] lg:bg-[#FFF8EA]">
    <span className="flex size-10 flex-none items-center justify-center overflow-hidden rounded-lg">{visual}</span>
    <span className="flex flex-1 flex-col gap-px">
      <span className="text-[15px] font-extrabold">{title}</span>
      {note && <span className="text-[13px] text-[#5C4A36]">{note}</span>}
    </span>
    {badge && (
      <span className="rounded-[10px] bg-[#A3401A] px-2 py-0.5 text-xs font-extrabold text-[#FFF8EA]">{badge}</span>
    )}
  </div>
)
