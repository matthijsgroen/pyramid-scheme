import type { FC, ReactNode } from "react"
import { focusOnMount, trapTab } from "@/ui/atoms/dialogFocus"
import { HaulRow } from "@/ui/molecules/HaulRow"

export type ComingHomeScreenProps = {
  title: string
  fire: ReactNode
  /** Hearts refilled and the line under them. */
  rest?: ReactNode
  haulTitle: string
  lines: { key: string; visual: ReactNode; title: string; note?: string; badge?: string }[]
  buttonLabel: string
  onDone: () => void
}

// Coming home: the fire, the rest, the haul of the trip and the button that unpacks it. Phone: a night
// screen; from `lg` a light card over it, fire on the left, haul on the right.
export const ComingHomeScreen: FC<ComingHomeScreenProps> = ({
  title,
  fire,
  rest,
  haulTitle,
  lines,
  buttonLabel,
  onDone,
}) => (
  <div className="fixed inset-0 z-40 flex h-(--screen-height) justify-center overflow-auto bg-[#1B2236] px-4 pt-[max(1.75rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] text-[#F4EAD5] lg:items-center lg:p-10">
    <section
      ref={focusOnMount}
      role="dialog"
      aria-modal="true"
      aria-labelledby="coming-home-title"
      tabIndex={-1}
      onKeyDown={trapTab}
      className="grid w-full max-w-md grid-cols-1 content-start justify-items-center gap-4 outline-none lg:max-w-3xl lg:grid-cols-[14rem_minmax(0,1fr)] lg:grid-rows-[auto_auto_1fr] lg:justify-items-stretch lg:gap-x-7 lg:rounded-[20px] lg:border-2 lg:border-[#2B2118] lg:bg-[#F4EAD5] lg:p-8 lg:text-[#2B2118]"
    >
      <h1
        id="coming-home-title"
        className="text-center font-pyramid text-2xl lg:col-start-2 lg:row-start-1 lg:text-left lg:text-[26px]"
      >
        {title}
      </h1>
      <div className="flex flex-col items-center gap-3 lg:col-start-1 lg:row-span-3 lg:row-start-1">
        <div className="flex h-36 items-center justify-center lg:h-40">{fire}</div>
        {rest && (
          <div className="flex flex-col items-center gap-1.5 text-center text-sm text-[#D9CFB8] lg:text-[#4A3B2A]">
            {rest}
          </div>
        )}
      </div>
      {lines.length > 0 && (
        <div className="flex w-full flex-col gap-2 rounded-[14px] bg-[#27304A] p-3.5 lg:col-start-2 lg:bg-transparent lg:p-0">
          <h2 className="text-xs font-extrabold tracking-widest text-[#C9CFE2] uppercase lg:text-[#5C4A36]">
            {haulTitle}
          </h2>
          {lines.map(line => (
            <HaulRow key={line.key} visual={line.visual} title={line.title} note={line.note} badge={line.badge} />
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={onDone}
        className="h-13 w-full self-end rounded-xl bg-[#A3401A] text-[17px] font-extrabold text-[#FFF8EA] hover:bg-[#8A3515] lg:col-start-2 lg:mt-2"
      >
        {buttonLabel}
      </button>
    </section>
  </div>
)
