import { useLayoutEffect, useRef, useState, type FC, type ReactNode } from "react"

export type HaulRowProps = {
  /** The picture on the left: an image, an icon or a small made grid. */
  visual: ReactNode
  title: string
  note?: string
  badge?: string
}

const BOX = 40

// The visual is drawn at its own size and scaled down until it fits the box whole, centred: every reward brings
// its own picture, at whatever size it was made for.
const Fitted: FC<{ children: ReactNode }> = ({ children }) => {
  const ref = useRef<HTMLSpanElement>(null)
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const content = ref.current?.firstElementChild
    if (!(content instanceof HTMLElement)) return
    const measure = () => {
      const size = Math.max(content.offsetWidth, content.offsetHeight)
      setScale(size > BOX ? BOX / size : 1)
    }
    measure()
    if (typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(measure)
    observer.observe(content)
    return () => observer.disconnect()
  }, [children])
  return (
    <span
      ref={ref}
      className="absolute inset-0 flex items-center justify-center leading-none *:max-w-none *:flex-none"
      style={scale < 1 ? { transform: `scale(${scale})` } : undefined}
    >
      {children}
    </span>
  )
}

// One line of the haul brought home.
export const HaulRow: FC<HaulRowProps> = ({ visual, title, note, badge }) => (
  <div className="flex items-center gap-3 rounded-[10px] border-2 border-transparent bg-[#F4EAD5] p-2.5 text-[#2B2118] lg:border-[#D6C4A0] lg:bg-[#FFF8EA]">
    <span className="relative flex size-10 flex-none overflow-hidden rounded-lg">
      <Fitted>{visual}</Fitted>
    </span>
    <span className="flex flex-1 flex-col gap-px">
      <span className="text-[15px] font-extrabold">{title}</span>
      {note && <span className="text-[13px] text-[#5C4A36]">{note}</span>}
    </span>
    {badge && (
      <span className="rounded-[10px] bg-[#A3401A] px-2 py-0.5 text-xs font-extrabold text-[#FFF8EA]">{badge}</span>
    )}
  </div>
)
