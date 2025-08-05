import type { FC } from "react"

// Calculate position along the corridor path based on segments
const getPositionOnCorridor = (
  progress: number,
  pathConfig: {
    segments: Array<{ x1: number; y1: number; x2: number; y2: number }>
  }
) => {
  const clampedProgress = Math.max(0, Math.min(1, progress))

  if (clampedProgress === 0) {
    return { x: pathConfig.segments[0].x1, y: pathConfig.segments[0].y1 }
  }

  if (clampedProgress === 1) {
    const lastSegment = pathConfig.segments[pathConfig.segments.length - 1]
    return { x: lastSegment.x2, y: lastSegment.y2 }
  }

  // Calculate total length of all segments
  let totalLength = 0
  const segmentLengths: number[] = []

  pathConfig.segments.forEach((segment) => {
    const length = Math.sqrt(
      Math.pow(segment.x2 - segment.x1, 2) +
        Math.pow(segment.y2 - segment.y1, 2)
    )
    segmentLengths.push(length)
    totalLength += length
  })

  // Find which segment the progress falls into
  const targetLength = totalLength * clampedProgress
  let currentLength = 0

  for (let i = 0; i < pathConfig.segments.length; i++) {
    const segmentLength = segmentLengths[i]

    if (currentLength + segmentLength >= targetLength) {
      // Progress is within this segment
      const segmentProgress = (targetLength - currentLength) / segmentLength
      const segment = pathConfig.segments[i]

      return {
        x: segment.x1 + (segment.x2 - segment.x1) * segmentProgress,
        y: segment.y1 + (segment.y2 - segment.y1) * segmentProgress,
      }
    }

    currentLength += segmentLength
  }

  // Fallback
  const lastSegment = pathConfig.segments[pathConfig.segments.length - 1]
  return { x: lastSegment.x2, y: lastSegment.y2 }
}

type TombMapButtonProps = {
  onClick: () => void
  inJourney: boolean
  label: string
  journeyProgress: number
  corridorComplexity?: "short" | "medium" | "long"
}

const getCorridorConfig = (complexity: "short" | "medium" | "long") => {
  switch (complexity) {
    case "short":
      return {
        segments: [
          { x1: 20, y1: 80, x2: 50, y2: 80 }, // Straight corridor
          { x1: 50, y1: 80, x2: 50, y2: 50 }, // Turn up
          { x1: 50, y1: 50, x2: 80, y2: 50 }, // Turn right
        ],
        startPos: { top: "80%", left: "20%" },
        endPos: { top: "50%", right: "20%" },
        rooms: [
          { x: 45, y: 75, width: 10, height: 10 }, // Small chamber
          { x: 75, y: 45, width: 10, height: 10 }, // End chamber
        ],
      }
    case "medium":
      return {
        segments: [
          { x1: 15, y1: 85, x2: 35, y2: 85 }, // Entry corridor
          { x1: 35, y1: 85, x2: 35, y2: 65 }, // Turn up
          { x1: 35, y1: 65, x2: 65, y2: 65 }, // Cross corridor
          { x1: 65, y1: 65, x2: 65, y2: 35 }, // Turn up
          { x1: 65, y1: 35, x2: 85, y2: 35 }, // Final corridor
        ],
        startPos: { top: "85%", left: "15%" },
        endPos: { top: "35%", right: "15%" },
        rooms: [
          { x: 30, y: 80, width: 10, height: 10 }, // Entry chamber
          { x: 30, y: 60, width: 10, height: 10 }, // Side chamber
          { x: 60, y: 60, width: 10, height: 10 }, // Central chamber
          { x: 80, y: 30, width: 10, height: 10 }, // Treasure chamber
        ],
      }
    case "long":
    default:
      return {
        segments: [
          { x1: 10, y1: 90, x2: 25, y2: 90 }, // Entry
          { x1: 25, y1: 90, x2: 25, y2: 70 }, // Turn up
          { x1: 25, y1: 70, x2: 45, y2: 70 }, // Right turn
          { x1: 45, y1: 70, x2: 45, y2: 50 }, // Up turn
          { x1: 45, y1: 50, x2: 25, y2: 50 }, // Left turn
          { x1: 25, y1: 50, x2: 25, y2: 30 }, // Up turn
          { x1: 25, y1: 30, x2: 55, y2: 30 }, // Right turn
          { x1: 55, y1: 30, x2: 55, y2: 50 }, // Down turn
          { x1: 55, y1: 50, x2: 75, y2: 50 }, // Right turn
          { x1: 75, y1: 50, x2: 75, y2: 20 }, // Final up
          { x1: 75, y1: 20, x2: 90, y2: 20 }, // To treasure
        ],
        startPos: { top: "90%", left: "10%" },
        endPos: { top: "20%", right: "10%" },
        rooms: [
          { x: 20, y: 85, width: 10, height: 10 }, // Entry chamber
          { x: 40, y: 65, width: 10, height: 10 }, // Side chamber 1
          { x: 20, y: 45, width: 10, height: 10 }, // Side chamber 2
          { x: 20, y: 25, width: 10, height: 10 }, // Upper chamber
          { x: 50, y: 25, width: 10, height: 10 }, // Central chamber
          { x: 70, y: 45, width: 10, height: 10 }, // Side chamber 3
          { x: 85, y: 15, width: 10, height: 10 }, // Treasure chamber
        ],
      }
  }
}

export const TombMapButton: FC<TombMapButtonProps> = ({
  onClick,
  inJourney,
  label,
  journeyProgress,
  corridorComplexity = "long",
}) => {
  const corridorConfig = getCorridorConfig(corridorComplexity)

  // Calculate the actual corridor length for accurate progress visualization
  const getActualCorridorLength = (corridorConfig: {
    segments: Array<{ x1: number; y1: number; x2: number; y2: number }>
  }) => {
    return corridorConfig.segments.reduce((total, segment) => {
      return (
        total +
        Math.sqrt(
          Math.pow(segment.x2 - segment.x1, 2) +
            Math.pow(segment.y2 - segment.y1, 2)
        )
      )
    }, 0)
  }

  const actualCorridorLength = getActualCorridorLength(corridorConfig)
  const clampedProgress = Math.max(0, Math.min(1, journeyProgress))
  const travelerPosition = getPositionOnCorridor(
    clampedProgress,
    corridorConfig
  )

  return (
    <button
      onClick={onClick}
      className="group relative mt-8 flex aspect-square w-full overflow-hidden rounded-lg border-2 border-stone-700 bg-stone-800 px-12 py-12 shadow-2xl transition-all duration-300 hover:scale-102 hover:shadow-xl"
      style={{
        background: `
          linear-gradient(45deg, rgba(68,64,60,0.3) 25%, transparent 25%),
          linear-gradient(-45deg, rgba(68,64,60,0.3) 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, rgba(68,64,60,0.3) 75%),
          linear-gradient(-45deg, transparent 75%, rgba(68,64,60,0.3) 75%),
          radial-gradient(circle at 20% 30%, rgba(217,119,6,0.2) 8%, transparent 8%),
          radial-gradient(circle at 80% 70%, rgba(217,119,6,0.15) 6%, transparent 6%),
          linear-gradient(135deg, #1c1917 0%, #292524 50%, #44403c 100%)
        `,
        backgroundSize:
          "15px 15px, 15px 15px, 15px 15px, 15px 15px, 60px 60px, 40px 40px, 100% 100%",
      }}
    >
      {/* Ancient scroll edge effect */}
      <div className="absolute -top-4 -right-8 h-12 w-24 rotate-45 border-b-2 border-l-2 border-amber-600 bg-amber-100 opacity-80 shadow-lg"></div>

      {/* Stone texture lines */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-0 h-0.5 w-full bg-stone-600"></div>
        <div className="absolute top-1/2 left-0 h-0.5 w-full bg-stone-600"></div>
        <div className="absolute top-3/4 left-0 h-0.5 w-full bg-stone-600"></div>
        <div className="absolute top-0 left-1/4 h-full w-0.5 bg-stone-600"></div>
        <div className="absolute top-0 left-1/2 h-full w-0.5 bg-stone-600"></div>
        <div className="absolute top-0 left-3/4 h-full w-0.5 bg-stone-600"></div>
      </div>

      {/* Tomb chambers (rooms) */}
      {corridorConfig.rooms.map((room, index) => (
        <div
          key={index}
          className="absolute bg-stone-600 opacity-60"
          style={{
            left: `${room.x}%`,
            top: `${room.y}%`,
            width: `${room.width}%`,
            height: `${room.height}%`,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}

      {/* Hieroglyphic symbols */}
      <div className="absolute top-1/5 left-1/5 text-amber-600 opacity-60">
        𓂀
      </div>
      <div className="absolute top-3/5 right-1/4 text-amber-600 opacity-60">
        𓃾
      </div>
      <div className="absolute bottom-1/5 left-3/5 text-amber-600 opacity-60">
        𓊖
      </div>

      {/* Journey Path */}
      {inJourney && (
        <div className="absolute inset-0">
          {/* Start Point - Entrance */}
          <div
            className="absolute mx-[-2%] flex size-1/24 items-center justify-center rounded-full bg-green-500 shadow-lg"
            style={corridorConfig.startPos}
          >
            <div className="h-4/5 rounded-full bg-white"></div>
          </div>

          {/* End Point - Treasure Chamber */}
          <div
            className="absolute mx-[-2%] mt-[-2%] flex size-1/24 items-center justify-center rounded-full bg-yellow-500 shadow-lg"
            style={corridorConfig.endPos}
          >
            <div className="size-4/5 rounded-full bg-white"></div>
          </div>

          {/* Corridor Path Lines */}
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {/* Full corridors (gray) */}
            {corridorConfig.segments.map((segment, index) => (
              <line
                key={`gray-${index}`}
                x1={segment.x1}
                y1={segment.y1}
                x2={segment.x2}
                y2={segment.y2}
                stroke="rgba(156, 163, 175, 0.4)"
                strokeWidth="3"
                strokeLinecap="round"
              />
            ))}

            {/* Progress corridors (colored) */}
            {corridorConfig.segments.map((segment, index) => {
              // Calculate what portion of this segment should be colored
              let segmentStartProgress = 0
              let segmentEndProgress = 0
              let currentLength = 0

              // Calculate progress ranges for each segment
              for (let i = 0; i <= index; i++) {
                const segLength = Math.sqrt(
                  Math.pow(
                    corridorConfig.segments[i].x2 -
                      corridorConfig.segments[i].x1,
                    2
                  ) +
                    Math.pow(
                      corridorConfig.segments[i].y2 -
                        corridorConfig.segments[i].y1,
                      2
                    )
                )

                if (i === index) {
                  segmentStartProgress = currentLength / actualCorridorLength
                  segmentEndProgress =
                    (currentLength + segLength) / actualCorridorLength
                }
                currentLength += segLength
              }

              // Only draw if progress reaches this segment
              if (clampedProgress > segmentStartProgress) {
                const segmentProgress = Math.min(
                  (clampedProgress - segmentStartProgress) /
                    (segmentEndProgress - segmentStartProgress),
                  1
                )

                const endX =
                  segment.x1 + (segment.x2 - segment.x1) * segmentProgress
                const endY =
                  segment.y1 + (segment.y2 - segment.y1) * segmentProgress

                return (
                  <line
                    key={`colored-${index}`}
                    x1={segment.x1}
                    y1={segment.y1}
                    x2={endX}
                    y2={endY}
                    stroke="rgb(34, 197, 94)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-in-out"
                  />
                )
              }
              return null
            })}

            {/* Traveler dot */}
            <circle
              cx={travelerPosition.x}
              cy={travelerPosition.y}
              r="2.5"
              fill="rgb(34, 197, 94)"
              className="transition-all duration-1000 ease-in-out"
            />
          </svg>
        </div>
      )}

      {/* Button text */}
      <span className="relative z-10 font-bold text-amber-200 transition-colors duration-300 group-hover:text-amber-100">
        🏺 {label}
      </span>

      {/* Ancient key symbol in corner */}
      <div className="absolute right-2 bottom-2 flex h-6 w-6 items-center justify-center rounded-full border border-amber-600 bg-stone-700 text-xs text-amber-400">
        🗝️
      </div>
    </button>
  )
}
