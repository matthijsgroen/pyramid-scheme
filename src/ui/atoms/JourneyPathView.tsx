import type { FC } from "react"

const PATHS = {
  short: "M 30 65 Q 45 45, 60 55",
  medium: "M 25 70 Q 40 35, 65 40 Q 75 50, 75 25",
  long: "M 17 75 Q 30 30, 50 40 Q 70 50, 83 17",
} as const

// Evaluate parametric position on the 3 hardcoded path strings
const evalPath = (t: number, path: string): { x: number; y: number } => {
  const q = (t: number, p0: number, p1: number, p2: number) => (1 - t) ** 2 * p0 + 2 * (1 - t) * t * p1 + t ** 2 * p2

  if (path === PATHS.short) {
    return { x: q(t, 30, 45, 60), y: q(t, 65, 45, 55) }
  }
  if (path === PATHS.medium) {
    const s = t <= 0.5 ? t * 2 : (t - 0.5) * 2
    return t <= 0.5 ? { x: q(s, 25, 40, 65), y: q(s, 70, 35, 40) } : { x: q(s, 65, 75, 75), y: q(s, 40, 50, 25) }
  }
  // long
  const s = t <= 0.5 ? t * 2 : (t - 0.5) * 2
  return t <= 0.5 ? { x: q(s, 17, 30, 50), y: q(s, 75, 30, 40) } : { x: q(s, 50, 70, 83), y: q(s, 40, 50, 17) }
}

// N positions evenly spaced by arc length along the path
const getNodePositions = (path: string, n: number): Array<{ x: number; y: number }> => {
  if (n <= 0) return []
  if (n === 1) return [evalPath(0.5, path)]
  const S = 200
  const pts = Array.from({ length: S + 1 }, (_, i) => evalPath(i / S, path))
  const arc = [0]
  for (let i = 1; i <= S; i++) {
    const dx = pts[i].x - pts[i - 1].x
    const dy = pts[i].y - pts[i - 1].y
    arc.push(arc[i - 1] + Math.sqrt(dx * dx + dy * dy))
  }
  const total = arc[S]
  return Array.from({ length: n }, (_, ni) => {
    const target = (ni / (n - 1)) * total
    let lo = 0,
      hi = S
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (arc[mid] < target) lo = mid + 1
      else hi = mid
    }
    if (lo === 0) return pts[0]
    const frac = (target - arc[lo - 1]) / (arc[lo] - arc[lo - 1])
    return {
      x: pts[lo - 1].x + (pts[lo].x - pts[lo - 1].x) * frac,
      y: pts[lo - 1].y + (pts[lo].y - pts[lo - 1].y) * frac,
    }
  })
}

type Props = {
  onClick: () => void
  onNodeClick?: (levelNr: number) => void // 1-based; only fires for completed nodes
  label: string
  inJourney: boolean
  levelCount: number
  levelNr: number // 1-based; levelNr-1 = sites completed in current run
  journeyLength: "short" | "medium" | "long"
  type: "pyramid" | "treasure_tomb"
  nudge?: boolean
  // 1-based levelNrs of completed nodes that still hold reachable, unexplored content — pinged so a
  // player with a fresh ward key sees which pyramid to re-enter.
  unexploredNodes?: ReadonlySet<number>
}

export const JourneyPathView: FC<Props> = ({
  onClick,
  onNodeClick,
  label,
  inJourney,
  levelCount,
  levelNr,
  journeyLength,
  type,
  nudge = false,
  unexploredNodes,
}) => {
  const path = PATHS[journeyLength]
  const nodes = inJourney ? getNodePositions(path, levelCount) : []
  const currentIdx = levelNr - 1 // 0-based index of the next site to play
  const isPyramid = type === "pyramid"

  return (
    <button
      onClick={onClick}
      className={`group relative mt-8 flex aspect-square w-full overflow-hidden rounded-lg p-12 shadow-2xl transition-all duration-300 hover:scale-102 hover:shadow-xl ${
        isPyramid ? "border-2 border-amber-800" : "border-2 border-stone-700"
      }`}
      style={
        isPyramid
          ? {
              background: `
          linear-gradient(45deg, rgba(180,83,9,0.1) 25%, transparent 25%),
          linear-gradient(-45deg, rgba(180,83,9,0.1) 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, rgba(180,83,9,0.1) 75%),
          linear-gradient(-45deg, transparent 75%, rgba(180,83,9,0.1) 75%),
          radial-gradient(circle at 30% 20%, rgba(251,191,36,0.3) 15%, transparent 15%),
          radial-gradient(circle at 70% 80%, rgba(239,68,68,0.2) 8%, transparent 8%),
          linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #f59e0b 100%)`,
              backgroundSize: "20px 20px, 20px 20px, 20px 20px, 20px 20px, 100px 100px, 80px 80px, 100% 100%",
            }
          : {
              background: `
          linear-gradient(45deg, rgba(68,64,60,0.3) 25%, transparent 25%),
          linear-gradient(-45deg, rgba(68,64,60,0.3) 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, rgba(68,64,60,0.3) 75%),
          linear-gradient(-45deg, transparent 75%, rgba(68,64,60,0.3) 75%),
          radial-gradient(circle at 20% 30%, rgba(217,119,6,0.2) 8%, transparent 8%),
          radial-gradient(circle at 80% 70%, rgba(217,119,6,0.15) 6%, transparent 6%),
          linear-gradient(135deg, #1c1917 0%, #292524 50%, #44403c 100%)`,
              backgroundSize: "15px 15px, 15px 15px, 15px 15px, 15px 15px, 60px 60px, 40px 40px, 100% 100%",
            }
      }
    >
      {/* Corner fold */}
      <div
        className={`absolute -top-6 -right-12 h-16 w-36 rotate-45 border-b-2 border-l-2 shadow-lg ${
          isPyramid ? "border-amber-700 bg-amber-200" : "border-amber-600 bg-amber-100 opacity-80"
        }`}
      />

      {/* Map-piece progress nudge */}
      {nudge && (
        <span className="absolute top-3 left-3 flex size-4 items-center justify-center">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-500 opacity-75" />
          <span className="relative inline-flex size-3 rounded-full bg-amber-500" />
        </span>
      )}

      {/* Grid lines */}
      <div className="absolute inset-0 opacity-20">
        {isPyramid ? (
          <>
            <div className="absolute top-1/3 left-0 h-0.5 w-full bg-amber-700" />
            <div className="absolute top-2/3 left-0 h-0.5 w-full bg-amber-700" />
            <div className="absolute top-0 left-1/3 h-full w-0.5 bg-amber-700" />
            <div className="absolute top-0 left-2/3 h-full w-0.5 bg-amber-700" />
          </>
        ) : (
          <>
            <div className="absolute top-1/4 left-0 h-0.5 w-full bg-stone-600" />
            <div className="absolute top-1/2 left-0 h-0.5 w-full bg-stone-600" />
            <div className="absolute top-3/4 left-0 h-0.5 w-full bg-stone-600" />
            <div className="absolute top-0 left-1/4 h-full w-0.5 bg-stone-600" />
            <div className="absolute top-0 left-1/2 h-full w-0.5 bg-stone-600" />
            <div className="absolute top-0 left-3/4 h-full w-0.5 bg-stone-600" />
          </>
        )}
      </div>

      {/* Decorative accents */}
      {isPyramid ? (
        <>
          <div className="absolute top-1/3 left-1/4 size-2 rotate-45 bg-red-600 opacity-60" />
          <div className="absolute top-1/2 right-1/4 size-1.5 rotate-45 bg-green-600 opacity-60" />
        </>
      ) : (
        <>
          <div className="absolute top-1/5 left-1/5 text-amber-600 opacity-60">𓂀</div>
          <div className="absolute bottom-1/5 left-3/5 text-amber-600 opacity-60">𓊖</div>
        </>
      )}

      {/* Path + site nodes */}
      {inJourney && (
        <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Node hover halo — plain CSS so it doesn't depend on Tailwind JIT picking up SVG hover
              utilities, and pointer-events:all so the transparent-when-idle circle still captures. */}
          <style>{`.jpv-node{fill:#fcd34d;opacity:0;pointer-events:all;cursor:pointer;transition:opacity .15s}.jpv-node:hover{opacity:.6}`}</style>
          {/* Faint full path */}
          <path
            d={path}
            stroke={isPyramid ? "rgba(107,114,128,0.35)" : "rgba(156,163,175,0.25)"}
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
          {/* Site nodes */}
          {nodes.map((pos, i) => {
            const isCompleted = i < currentIdx
            const isCurrent = i === currentIdx
            if (isCompleted) {
              return (
                <g key={i}>
                  {/* Single hit-target + hover halo. pointer-events on the dot are disabled so the
                      whole radius (center included) hovers this circle, not the dot on top of it. */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="9"
                    onClick={
                      onNodeClick
                        ? e => {
                            e.stopPropagation()
                            e.nativeEvent.stopImmediatePropagation()
                            onNodeClick(i + 1)
                          }
                        : undefined
                    }
                    className={onNodeClick ? "jpv-node" : "pointer-events-none fill-transparent"}
                  />
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="3.5"
                    fill="rgb(245,158,11)"
                    stroke="rgb(180,83,9)"
                    strokeWidth="0.8"
                    className="pointer-events-none"
                  />
                  {/* Emerald pulse: this completed pyramid still holds unvisited content (a skipped
                      chest/puzzle, or a ward path/tableau a key you now hold unlocks). Only completed
                      nodes light — the pyramid you're currently in never does. */}
                  {unexploredNodes?.has(i + 1) && (
                    // SMIL animating r + opacity, not `animate-ping`: a CSS scale() transform on an
                    // SVG element scales about the SVG origin (0,0), so the ring would drift toward
                    // the corner instead of pulsing in place. Growing `r` expands from the fixed centre.
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      fill="none"
                      stroke="rgb(16,185,129)"
                      strokeWidth="1"
                      className="pointer-events-none"
                    >
                      <animate attributeName="r" values="3.5;7" dur="1.1s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.8;0" dur="1.1s" repeatCount="indefinite" />
                    </circle>
                  )}
                </g>
              )
            }
            if (isCurrent) {
              return (
                <g key={i} className="animate-pulse">
                  <circle cx={pos.x} cy={pos.y} r="5.5" fill="rgba(251,191,36,0.25)" />
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="3.5"
                    fill="rgb(251,191,36)"
                    stroke="rgb(180,83,9)"
                    strokeWidth="0.8"
                  />
                </g>
              )
            }
            return (
              <circle
                key={i}
                cx={pos.x}
                cy={pos.y}
                r="3"
                fill={isPyramid ? "rgba(255,255,255,0.6)" : "rgba(180,170,160,0.25)"}
                stroke={isPyramid ? "rgba(107,114,128,0.5)" : "rgba(156,163,175,0.4)"}
                strokeWidth="0.8"
              />
            )
          })}
        </svg>
      )}

      {/* Label — pointer-events-none so node clicks/hovers underneath still reach the SVG circles */}
      <span
        className={`pointer-events-none relative z-10 text-2xl font-bold transition-colors duration-300 ${
          isPyramid ? "text-amber-900 group-hover:text-amber-800" : "text-amber-200 group-hover:text-amber-100"
        }`}
      >
        {isPyramid ? "🗺️" : "🏺"} {label}
      </span>

      {/* Corner icon */}
      <div
        className={`pointer-events-none absolute right-2 bottom-2 flex size-6 items-center justify-center rounded-full border text-xs ${
          isPyramid ? "border-amber-700 bg-amber-100 text-amber-800" : "border-amber-600 bg-stone-700 text-amber-400"
        }`}
      >
        {isPyramid ? "⊕" : "🗝️"}
      </div>
    </button>
  )
}
