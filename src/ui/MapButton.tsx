import type { FC } from "react"

// Calculate position along the curved path based on arc length
const getPositionOnPath = (progress: number, pathConfig: { path: string }) => {
  // For better accuracy, we'll sample more points and find the position
  // that corresponds to the actual arc length progress
  const totalSamples = 100
  let totalLength = 0
  const points = []

  // Calculate total path length by sampling points
  for (let i = 0; i <= totalSamples; i++) {
    const t = i / totalSamples
    const point = getParametricPosition(t, pathConfig)
    points.push(point)

    if (i > 0) {
      const prevPoint = points[i - 1]
      const distance = Math.sqrt(
        Math.pow(point.x - prevPoint.x, 2) + Math.pow(point.y - prevPoint.y, 2)
      )
      totalLength += distance
    }
  }

  // Find the point at the desired progress along the arc length
  const targetLength = totalLength * progress
  let currentLength = 0

  for (let i = 1; i < points.length; i++) {
    const prevPoint = points[i - 1]
    const currentPoint = points[i]
    const segmentLength = Math.sqrt(
      Math.pow(currentPoint.x - prevPoint.x, 2) +
        Math.pow(currentPoint.y - prevPoint.y, 2)
    )

    if (currentLength + segmentLength >= targetLength) {
      // Interpolate between the two points
      const ratio = (targetLength - currentLength) / segmentLength
      return {
        x: prevPoint.x + (currentPoint.x - prevPoint.x) * ratio,
        y: prevPoint.y + (currentPoint.y - prevPoint.y) * ratio,
      }
    }

    currentLength += segmentLength
  }

  // Fallback to the last point
  return points[points.length - 1]
}

// Helper function for parametric position calculation
const getParametricPosition = (t: number, pathConfig: { path: string }) => {
  // Parse the path string to extract control points
  // For now, we'll handle the three predefined path types
  if (pathConfig.path === "M 30 65 Q 45 45, 60 55") {
    // Short path - single quadratic curve
    const p0 = { x: 30, y: 65 }
    const p1 = { x: 45, y: 45 }
    const p2 = { x: 60, y: 55 }

    const x =
      Math.pow(1 - t, 2) * p0.x + 2 * (1 - t) * t * p1.x + Math.pow(t, 2) * p2.x
    const y =
      Math.pow(1 - t, 2) * p0.y + 2 * (1 - t) * t * p1.y + Math.pow(t, 2) * p2.y
    return { x, y }
  } else if (pathConfig.path === "M 25 70 Q 40 35, 65 40 Q 75 50, 75 25") {
    // Medium path - two quadratic curves
    if (t <= 0.5) {
      // First curve: M 25 70 Q 40 35, 65 40
      const localT = t * 2
      const p0 = { x: 25, y: 70 }
      const p1 = { x: 40, y: 35 }
      const p2 = { x: 65, y: 40 }

      const x =
        Math.pow(1 - localT, 2) * p0.x +
        2 * (1 - localT) * localT * p1.x +
        Math.pow(localT, 2) * p2.x
      const y =
        Math.pow(1 - localT, 2) * p0.y +
        2 * (1 - localT) * localT * p1.y +
        Math.pow(localT, 2) * p2.y
      return { x, y }
    } else {
      // Second curve: M 65 40 Q 75 50, 75 25
      const localT = (t - 0.5) * 2
      const p0 = { x: 65, y: 40 }
      const p1 = { x: 75, y: 50 }
      const p2 = { x: 75, y: 25 }

      const x =
        Math.pow(1 - localT, 2) * p0.x +
        2 * (1 - localT) * localT * p1.x +
        Math.pow(localT, 2) * p2.x
      const y =
        Math.pow(1 - localT, 2) * p0.y +
        2 * (1 - localT) * localT * p1.y +
        Math.pow(localT, 2) * p2.y
      return { x, y }
    }
  } else {
    // Long path (default) - two quadratic curves: M 17 75 Q 30 30, 50 40 Q 70 50, 83 17
    if (t <= 0.5) {
      // First curve: M 17 75 Q 30 30, 50 40
      const localT = t * 2
      const p0 = { x: 17, y: 75 }
      const p1 = { x: 30, y: 30 }
      const p2 = { x: 50, y: 40 }

      const x =
        Math.pow(1 - localT, 2) * p0.x +
        2 * (1 - localT) * localT * p1.x +
        Math.pow(localT, 2) * p2.x
      const y =
        Math.pow(1 - localT, 2) * p0.y +
        2 * (1 - localT) * localT * p1.y +
        Math.pow(localT, 2) * p2.y
      return { x, y }
    } else {
      // Second curve: M 50 40 Q 70 50, 83 17
      const localT = (t - 0.5) * 2
      const p0 = { x: 50, y: 40 }
      const p1 = { x: 70, y: 50 }
      const p2 = { x: 83, y: 17 }

      const x =
        Math.pow(1 - localT, 2) * p0.x +
        2 * (1 - localT) * localT * p1.x +
        Math.pow(localT, 2) * p2.x
      const y =
        Math.pow(1 - localT, 2) * p0.y +
        2 * (1 - localT) * localT * p1.y +
        Math.pow(localT, 2) * p2.y
      return { x, y }
    }
  }
}

type MapButtonProps = {
  onClick: () => void
  inJourney: boolean
  label: string
  journeyProgress: number
  pathRotation?: number // Rotation in degrees (0, 90, 180, 270)
  pathLength?: "short" | "medium" | "long" // Journey distance
}

const getPathConfig = (length: "short" | "medium" | "long") => {
  switch (length) {
    case "short":
      return {
        path: "M 30 65 Q 45 45, 60 55", // Shorter, simpler path
        startPos: { top: "65%", left: "30%" },
        endPos: { top: "55%", right: "40%" },
      }
    case "medium":
      return {
        path: "M 25 70 Q 40 35, 65 40 Q 75 50, 75 25", // Medium complexity
        startPos: { top: "70%", left: "25%" },
        endPos: { top: "25%", right: "25%" },
      }
    case "long":
    default:
      return {
        path: "M 17 75 Q 30 30, 50 40 Q 70 50, 83 17", // Original long path
        startPos: { top: "75%", left: "17%" },
        endPos: { top: "17%", right: "17%" },
      }
  }
}

export const MapButton: FC<MapButtonProps> = ({
  onClick,
  inJourney,
  label,
  journeyProgress,
  pathRotation = 0,
  pathLength = "long",
}) => {
  const pathConfig = getPathConfig(pathLength)

  // Calculate the actual path length for accurate stroke-dashoffset
  const getActualPathLength = (pathConfig: { path: string }) => {
    const totalSamples = 100
    let totalLength = 0

    for (let i = 1; i <= totalSamples; i++) {
      const prevT = (i - 1) / totalSamples
      const currentT = i / totalSamples
      const prevPoint = getParametricPosition(prevT, pathConfig)
      const currentPoint = getParametricPosition(currentT, pathConfig)

      const distance = Math.sqrt(
        Math.pow(currentPoint.x - prevPoint.x, 2) +
          Math.pow(currentPoint.y - prevPoint.y, 2)
      )
      totalLength += distance
    }

    return totalLength
  }

  const actualPathLength = getActualPathLength(pathConfig)

  // Ensure the traveler position matches the visual progress of the colored line
  // Clamp the progress to ensure it's between 0 and 1
  const clampedProgress = Math.max(0, Math.min(1, journeyProgress))
  const travelerPosition = getPositionOnPath(clampedProgress, pathConfig)

  return (
    <button
      onClick={onClick}
      className="group relative mt-8 flex aspect-square w-full overflow-hidden rounded-lg border-2 border-amber-800 bg-amber-50 px-12 py-12 shadow-2xl transition-all duration-300 hover:scale-102 hover:shadow-xl"
      style={{
        background: `
          linear-gradient(45deg, rgba(180,83,9,0.1) 25%, transparent 25%),
          linear-gradient(-45deg, rgba(180,83,9,0.1) 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, rgba(180,83,9,0.1) 75%),
          linear-gradient(-45deg, transparent 75%, rgba(180,83,9,0.1) 75%),
          radial-gradient(circle at 30% 20%, rgba(251,191,36,0.3) 15%, transparent 15%),
          radial-gradient(circle at 70% 80%, rgba(239,68,68,0.2) 8%, transparent 8%),
          linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #f59e0b 100%)
        `,
        backgroundSize:
          "20px 20px, 20px 20px, 20px 20px, 20px 20px, 100px 100px, 80px 80px, 100% 100%",
      }}
    >
      {/* Fold effect - top right corner */}
      <div className="absolute -top-6 -right-12 h-16 w-36 rotate-45 border-b-2 border-l-2 border-amber-700 bg-amber-200 shadow-lg"></div>

      {/* Map grid lines */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/3 left-0 h-0.5 w-full bg-amber-700"></div>
        <div className="absolute top-2/3 left-0 h-0.5 w-full bg-amber-700"></div>
        <div className="absolute top-0 left-1/3 h-full w-0.5 bg-amber-700"></div>
        <div className="absolute top-0 left-2/3 h-full w-0.5 bg-amber-700"></div>
      </div>

      {/* Map landmarks */}
      <div className="absolute top-1/3 left-1/4 h-2 w-2 rotate-45 bg-red-600"></div>
      <div className="absolute top-1/2 right-1/4 h-1.5 w-1.5 rotate-45 bg-green-600"></div>
      <div className="absolute bottom-1/4 left-1/2 h-1 w-1 rounded-full bg-blue-600"></div>

      {/* Journey Path */}
      {inJourney && (
        <div
          className="absolute inset-0"
          style={{
            transform: `rotate(${pathRotation}deg)`,
            transformOrigin: "center",
          }}
        >
          {/* Start Point */}
          <div
            className="absolute mx-[-2%] flex size-1/24 items-center justify-center rounded-full bg-blue-500 shadow-lg"
            style={pathConfig.startPos}
          >
            <div className="h-4/5 rounded-full bg-white"></div>
          </div>

          {/* End Point */}
          <div
            className="absolute mx-[-2%] mt-[-2%] flex size-1/24 items-center justify-center rounded-full bg-red-600 shadow-lg"
            style={pathConfig.endPos}
          >
            <div className="size-4/5 rounded-full bg-white"></div>
          </div>

          {/* Journey Path Line */}
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {/* Full path (gray) */}
            <path
              d={pathConfig.path}
              stroke="rgba(107, 114, 128, 0.4)"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            {/* Progress path (colored) */}
            <path
              d={pathConfig.path}
              stroke="rgb(59, 130, 246)"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={actualPathLength}
              strokeDashoffset={
                actualPathLength - clampedProgress * actualPathLength
              }
              className="transition-all duration-1000 ease-in-out"
            />
            {/* Traveler dot */}
            <circle
              cx={travelerPosition.x}
              cy={travelerPosition.y}
              r="2"
              fill="rgb(59, 130, 246)"
              className="transition-all duration-1000 ease-in-out"
            />
          </svg>
        </div>
      )}
      {/* Button text */}
      <span className="relative z-10 text-2xl font-bold text-amber-900 transition-colors duration-300 group-hover:text-amber-800">
        🗺️ {label}
      </span>

      {/* Compass rose in corner */}
      <div className="absolute right-2 bottom-2 flex h-6 w-6 items-center justify-center rounded-full border border-amber-700 bg-amber-100 text-xs text-amber-800">
        ⊕
      </div>
    </button>
  )
}
