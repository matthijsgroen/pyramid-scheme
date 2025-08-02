import type { FC, PropsWithChildren } from "react"
import {
  colors,
  dayNightCycleStep,
  sandBottom,
  sandTop,
  skyBottom,
  skyMiddle,
  skyTop,
  type DayNightCycleStep,
} from "@/ui/backdropSelection"

export const Backdrop: FC<
  PropsWithChildren<{
    levelNr: number
    start: DayNightCycleStep
  }>
> = ({ children, levelNr, start }) => {
  const step = dayNightCycleStep(levelNr, start)

  return (
    <div
      className="[container-type:size] relative flex h-screen flex-col bg-gradient-to-b from-(--sky-top) from-0% via-(--sky-middle) via-40% to-(--sky-bottom) to-55% transition-colors duration-6000"
      style={{
        "--sky-top": colors[skyTop[step]],
        "--sky-middle": colors[skyMiddle[step]],
        "--sky-bottom": colors[skyBottom[step]],
        "--sun-offset": `${5 + 5 * step}cqh`,
        "--moon-offset": `${100 - 6 * step}cqh`,
      }}
    >
      <div className="absolute z-0 size-20 translate-x-1/1 translate-y-(--sun-offset) rounded-full bg-yellow-200 transition-transform duration-6000"></div>
      {/* Crescent moon: two overlapping circles */}
      <div
        className="absolute right-0 z-0 size-20 -translate-x-1/1 translate-y-(--moon-offset) overflow-hidden rounded-full bg-sky-50 transition-transform duration-6000"
        style={{ pointerEvents: "none" }}
      >
        <div className="absolute top-0 left-3 size-20 rounded-full bg-sky-400"></div>
      </div>
      <div
        className="absolute inset-0 z-10 flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-transparent from-49% via-(--sand-top) via-50% to-(--sand-bottom) transition-colors duration-6000"
        style={{
          "--sand-top": colors[sandTop[step]],
          "--sand-bottom": colors[sandBottom[step]],
        }}
      >
        {children}
      </div>
    </div>
  )
}
