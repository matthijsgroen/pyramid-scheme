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
} from "@/ui/atoms/backdropSelection"
import sphinx from "@/assets/landmarks/sphinx.svg"

/** What stands on the horizon behind a journey's pyramid. A journey authors its own copy of this list
 * (`src/data/journeys.ts`), because the design system imports nothing from `src/`. */
export type Landmark = "sphinx"

// Flat silhouettes, drawn as a mask so the backdrop tints them with the hour.
const landmarkImages: Record<Landmark, string> = { sphinx }

export const DesertBackdrop: FC<
  PropsWithChildren<{
    levelNr: number
    start: DayNightCycleStep
    timeStepSize?: number
    showNile?: boolean
    landmark?: Landmark
  }>
> = ({ children, levelNr, start, timeStepSize = 3, showNile = false, landmark }) => {
  const step = dayNightCycleStep(levelNr, start, timeStepSize)
  const transitionDuration = "duration-12000"

  return (
    <div
      className={clsx(
        "[container-type:size] relative flex h-full flex-col bg-gradient-to-b from-(--sky-top) from-0% via-(--sky-middle) via-40% to-(--sky-bottom) to-55% transition-colors",
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
        {landmark && (
          // Right of the board and clear of the Nile and the sun; the moon may rise behind it. Its base
          // sinks a pixel into the sand, and it is tinted between the two sand shades so it stays a
          // distant shape at every hour rather than a cut-out.
          <div
            data-landmark={landmark}
            className={clsx(
              "pointer-events-none absolute right-2 bottom-1/2 aspect-[118/40] w-20 translate-y-px bg-[color-mix(in_srgb,color-mix(in_srgb,var(--sand-bottom)_70%,var(--sky-middle))_80%,black)] transition-colors sm:right-[12%] sm:w-24",
              transitionDuration
            )}
            style={{
              maskImage: `url("${landmarkImages[landmark]}")`,
              maskSize: "contain",
              maskRepeat: "no-repeat",
              maskPosition: "bottom",
            }}
          />
        )}
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
