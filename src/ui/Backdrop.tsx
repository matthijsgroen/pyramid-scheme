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
        "--sun-offset": `${5 * step}cqh`,
      }}
    >
      <div className="absolute size-20 rounded-full bg-yellow-200 z-0 transition-transform translate-x-1/1 translate-y-(--sun-offset) duration-6000"></div>
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
