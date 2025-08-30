import type { FC, PropsWithChildren } from "react"
import { clsx } from "clsx"
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

export const DesertBackdrop: FC<
  PropsWithChildren<{
    levelNr: number
    start: DayNightCycleStep
    timeStepSize?: number
    showNile?: boolean
  }>
> = ({ children, levelNr, start, timeStepSize = 3, showNile = false }) => {
  const step = dayNightCycleStep(levelNr, start, timeStepSize)
  const transitionDuration = "duration-12000"

  return (
    <div
      className={clsx(
        "[container-type:size] relative flex h-dvh flex-col bg-gradient-to-b from-(--sky-top) from-0% via-(--sky-middle) via-40% to-(--sky-bottom) to-55% transition-colors",
        transitionDuration
      )}
      style={{
        "--sky-top": colors[skyTop[step]],
        "--sky-middle": colors[skyMiddle[step]],
        "--sky-bottom": colors[skyBottom[step]],
        "--sun-offset": `${5 + 5 * step}cqh`,
        "--moon-offset": `${100 - 6 * step}cqh`,
        "--sand-top": colors[sandTop[step]],
        "--sand-bottom": colors[sandBottom[step]],
      }}
    >
      <div
        className={clsx(
          "absolute z-0 size-20 translate-x-1/1 translate-y-(--sun-offset) rounded-full bg-yellow-200 transition-transform",
          transitionDuration
        )}
      ></div>
      {/* Crescent moon: two overlapping circles */}
      <div
        className={clsx(
          "absolute right-0 z-0 size-20 -translate-x-1/1 translate-y-(--moon-offset) overflow-hidden rounded-full bg-sky-50 transition-transform",
          transitionDuration
        )}
        style={{ pointerEvents: "none" }}
      >
        <div className="absolute top-0 left-3 size-20 rounded-full bg-sky-400"></div>
      </div>
      <div
        className={clsx(
          "absolute inset-0 z-10 flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-transparent from-49% via-(--sand-top) via-50% to-(--sand-bottom) transition-colors",
          transitionDuration
        )}
      >
        {showNile && (
          <div
            className={clsx(
              "absolute top-1/2 right-1/2 bottom-1/3 left-0 bg-gradient-to-b from-(--sky-bottom) to-(--sky-top) bg-clip-content transition-colors [clip-path:polygon(93%_0,_0_17%,_0_67%)]",
              transitionDuration
            )}
          ></div>
        )}
        {children}
      </div>
    </div>
  )
}
