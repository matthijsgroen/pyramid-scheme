import type { FC } from "react"

/**
 * The things that stand on this family’s boards: what grows out of a basin, and what rises at a road
 * junction. Their own module because a file that exports components may export nothing else — fast refresh
 * needs the split, and the skin table next door is not a component.
 */

/**
 * What grows out of a basin, in three stages: a shoot while it is short of its channels, a full plant once it
 * has them, and a plant **in flower** when the board is finished.
 *
 * The flower is the completion animation for this skin — the run puts one on every plant, one basin at a
 * time. Which is why a fed basin stops short of it: if a plant flowered the moment it had its water, the
 * finish would have nothing left to say.
 *
 * It grows above the disc rather than behind the number: drawn behind it, a digit on top of a stem is a digit
 * you have to work to read, and the number is the clue (§8).
 */
export const Plant: FC<{ grown: boolean; flowering?: boolean }> = ({ grown, flowering }) => (
  <svg viewBox="0 0 24 24" className="size-full" aria-hidden focusable="false">
    <g fill="none" stroke="currentColor" strokeWidth={grown ? 2 : 2.4} strokeLinecap="round">
      <line x1={12} y1={24} x2={12} y2={grown ? 7 : 15} />
      <path d={grown ? "M12 16 C 7 15, 5 12, 5 8" : "M12 19 C 9 18, 8 16, 8 13"} />
      <path d={grown ? "M12 16 C 17 15, 19 12, 19 8" : "M12 19 C 15 18, 16 16, 16 13"} />
      {grown && <path d="M12 11 C 8 10, 7 7, 7 4" />}
      {grown && <path d="M12 11 C 16 10, 17 7, 17 4" />}
    </g>
    {flowering && (
      <g className="animate-flower-in">
        {/* Five petals round a heart — a blossom has to read as a flower at 30px, and a single dot does not. */}
        {[0, 1, 2, 3, 4].map(petal => {
          const angle = (petal * 2 * Math.PI) / 5 - Math.PI / 2
          return (
            <circle
              key={petal}
              cx={12 + Math.cos(angle) * 3.4}
              cy={5 + Math.sin(angle) * 3.4}
              r={2.1}
              fill="currentColor"
            />
          )
        })}
        <circle cx={12} cy={5} r={1.7} className="fill-amber-200" />
      </g>
    )}
  </svg>
)

/**
 * What stands at a junction: a staked-out foundation while the site is short of its roads, a built pyramid
 * once the roads reach it, and a **capstone** on it when the network is finished.
 *
 * The same three stages the plant has, and for the same reason — the last one belongs to the completion run,
 * so a served site deliberately stops short of it. A pyramid is drawn rather than filled flat because a
 * flat triangle on sand is a triangle; the courses are what make it masonry.
 */
export const Pyramid: FC<{ grown: boolean; flowering?: boolean }> = ({ grown, flowering }) => (
  <svg viewBox="0 0 24 24" className="size-full" aria-hidden focusable="false">
    {grown ? (
      <>
        <path d="M12 3 L22 22 L2 22 Z" className="fill-stone-200 stroke-stone-700" strokeWidth={1.4} />
        {/* Two courses, which is all it takes to stop reading as a road sign. */}
        <path d="M6.5 16 L17.5 16 M9 10 L15 10" className="stroke-stone-500" strokeWidth={1} fill="none" />
      </>
    ) : (
      // Staked out, not yet built: the footprint and one course of stone.
      <path
        d="M4.5 22 L19.5 22 M7 17 L17 17 M12 8 L17 17 M12 8 L7 17"
        className="stroke-stone-600"
        strokeWidth={1.4}
        strokeDasharray="2.6 2"
        strokeLinecap="round"
        fill="none"
      />
    )}
    {flowering && (
      <g className="animate-flower-in">
        {/* The capstone going on, gilded — the one thing on this board that is not stone-coloured. */}
        <path d="M12 1.5 L16 9 L8 9 Z" className="fill-amber-300 stroke-amber-600" strokeWidth={0.8} />
      </g>
    )}
  </svg>
)
