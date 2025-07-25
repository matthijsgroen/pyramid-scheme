import type { FC, PropsWithChildren } from "react"
import {
  colors,
  dayNightCycleStep,
  sandBottom,
  sandTop,
  skyBottom,
  skyMiddle,
  skyTop,
} from "./backdropSelection"

export const Backdrop: FC<PropsWithChildren<{ levelNr: number }>> = ({
  children,
  levelNr,
}) => {
  const step = dayNightCycleStep(levelNr)

  return (
    <div
      className="relative flex flex-col h-screen bg-gradient-to-b from-0% via-40% to-55% from-(--sky-top) via-(--sky-middle) to-(--sky-bottom) transition-colors duration-6000 [container-type:size]"
      style={{
        "--sky-top": colors[skyTop[step]],
        "--sky-middle": colors[skyMiddle[step]],
        "--sky-bottom": colors[skyBottom[step]],
        "--sun-offset": `${5 + 5 * step}cqh`,
        "--moon-offset": `${100 - 6 * step}cqh`,
      }}
    >
      <div className="absolute size-20 rounded-full bg-yellow-200 z-0 transition-transform translate-x-1/1 translate-y-(--sun-offset) duration-6000"></div>
      {/* Crescent moon: two overlapping circles */}
      <div
        className="absolute right-0 size-20 rounded-full bg-sky-50 z-0 transition-transform -translate-x-1/1 translate-y-(--moon-offset) duration-6000 overflow-hidden"
        style={{ pointerEvents: "none" }}
      >
        <div className="absolute left-3 top-0 size-20 rounded-full bg-sky-400"></div>
      </div>
      <div
        className="absolute inset-0 z-10 flex-1 flex-col flex items-center justify-center transition-colors duration-6000 bg-gradient-to-b from-transparent from-49% via-50% via-(--sand-top) to-(--sand-bottom)"
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
