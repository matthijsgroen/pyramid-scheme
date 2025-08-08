import type { FC } from "react"
import clsx from "clsx"
import type { Difficulty } from "@/data/difficultyLevels"

type HieroglyphTileProps = {
  symbol?: string
  difficulty?: Difficulty
  size?: "sm" | "md" | "lg"
  selected?: boolean
  disabled?: boolean
  empty?: boolean
  onClick?: () => void
  className?: string
}

const sizeClasses = {
  sm: "w-8 h-10 text-sm",
  md: "w-12 h-14 text-lg",
  lg: "w-16 h-20 text-2xl",
}

// Stone-like edge variations with chips and imperfections
const edgeVariations = [
  // Variation 1: Large chip on top-right corner
  "clip-path: polygon(0% 0%, 85% 0%, 100% 15%, 100% 100%, 0% 100%);",
  // Variation 2: Significant chip on bottom-left
  "clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 20% 100%, 0% 80%);",
  // Variation 3: Big chip on top-left corner
  "clip-path: polygon(15% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 20%);",
  // Variation 4: Deep notch on right edge
  "clip-path: polygon(0% 0%, 100% 0%, 100% 35%, 80% 45%, 85% 55%, 100% 65%, 100% 100%, 0% 100%);",
  // Variation 5: Large chip on bottom-right
  "clip-path: polygon(0% 0%, 100% 0%, 100% 80%, 80% 100%, 0% 100%);",
  // Variation 6: Multiple dramatic chips
  "clip-path: polygon(0% 0%, 85% 0%, 100% 12%, 100% 35%, 90% 45%, 100% 55%, 100% 85%, 88% 100%, 0% 100%, 0% 88%, 12% 82%, 0% 75%, 0% 15%);",
  // Variation 7: Heavily weathered corners
  "clip-path: polygon(12% 0%, 88% 0%, 100% 12%, 100% 88%, 88% 100%, 12% 100%, 0% 88%, 0% 12%);",
  // Variation 8: Dramatic asymmetric damage
  "clip-path: polygon(0% 0%, 90% 0%, 100% 18%, 100% 100%, 25% 100%, 0% 75%);",
  // Variation 9: Cracked corner effect
  "clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 15% 100%, 8% 92%, 0% 85%);",
  // Variation 10: Battle-worn edges
  "clip-path: polygon(8% 0%, 92% 0%, 100% 8%, 100% 45%, 92% 50%, 100% 55%, 100% 92%, 92% 100%, 8% 100%, 0% 92%, 0% 8%);",
  // Variation 11: Ancient erosion pattern
  "clip-path: polygon(0% 0%, 88% 0%, 95% 5%, 100% 12%, 100% 88%, 95% 95%, 88% 100%, 12% 100%, 5% 95%, 0% 88%, 0% 25%, 8% 20%, 0% 15%);",
  // Variation 12: Dramatic left side damage
  "clip-path: polygon(25% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 60%, 15% 55%, 0% 40%);",
]

// Generate consistent edge variation based on content
const getEdgeVariation = (symbol?: string, difficulty?: string): string => {
  if (!symbol || !difficulty) return edgeVariations[0]
  const hash = (symbol + difficulty).split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0)
    return a & a
  }, 0)
  return edgeVariations[Math.abs(hash) % edgeVariations.length]
}

export const HieroglyphTile: FC<HieroglyphTileProps> = ({
  symbol,
  difficulty,
  size = "md",
  selected = false,
  disabled = false,
  empty = false,
  onClick,
  className,
}) => {
  // If empty, show placeholder hole style
  if (empty) {
    return (
      <div
        onClick={onClick}
        className={clsx(
          // Base empty tile styling - looks like a recessed hole
          "flex items-center justify-center rounded-lg",
          "bg-gray-100 text-gray-400 opacity-50",
          "transition-all duration-200",

          // Make clickable if onClick is provided
          onClick && "cursor-pointer hover:bg-gray-200",

          // Size variations - EXACT same as filled tiles
          sizeClasses[size],

          className
        )}
        style={{
          // Simple inset shadow to create hole effect - no complex backgrounds
          boxShadow:
            "inset 2px 2px 4px rgba(0, 0, 0, 0.2), inset -1px -1px 2px rgba(255, 255, 255, 0.5)",
          // Simple outline to suggest dashed border without affecting dimensions
          outline: "1px dashed rgba(156, 163, 175, 0.4)",
          outlineOffset: "-1px",
        }}
      >
        <span
          className={clsx(
            "flex h-full w-full items-center justify-center font-mono select-none",
            size === "sm" ? "text-xs" : size === "md" ? "text-lg" : "text-2xl"
          )}
        >
          ?
        </span>
      </div>
    )
  }

  // Regular tile requires symbol and difficulty
  if (!symbol || !difficulty) {
    throw new Error(
      "HieroglyphTile requires both symbol and difficulty when not empty"
    )
  }

  const edgeVariation = getEdgeVariation(symbol, difficulty)

  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={clsx(
        // Base 3D stone tile styling with relative positioning for pseudo-element shadow
        "relative flex items-center justify-center font-bold transition-all duration-200",
        "transform-gpu",

        // Size variations
        sizeClasses[size],

        // Interactive states
        {
          "cursor-pointer hover:scale-105 hover:-translate-y-1 active:scale-95 active:translate-y-0":
            !disabled && onClick,
          "cursor-default opacity-50 grayscale": disabled,
          "ring-2 ring-blue-400 ring-offset-2": selected && !disabled,
        },

        className
      )}
      style={{
        // Stone-like chipped edges
        clipPath: edgeVariation.replace("clip-path: ", "").replace(";", ""),

        // Realistic 3D stone tile appearance with subtle texture overlay (darker for carved effect)
        backgroundImage: disabled
          ? "linear-gradient(145deg, #9ca3af, #6b7280)"
          : difficulty === "starter"
            ? `
              radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
              radial-gradient(circle at 80% 80%, rgba(0, 0, 0, 0.15) 1px, transparent 1px),
              radial-gradient(circle at 40% 60%, rgba(255, 255, 255, 0.05) 0.5px, transparent 0.5px),
              linear-gradient(145deg, #d6d3d1 0%, #a8a29e 25%, #78716c 75%, #57534e 100%)
            `
            : difficulty === "junior"
              ? `
                radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                radial-gradient(circle at 80% 80%, rgba(0, 0, 0, 0.15) 1px, transparent 1px),
                radial-gradient(circle at 40% 60%, rgba(255, 255, 255, 0.05) 0.5px, transparent 0.5px),
                linear-gradient(145deg, #fcd34d 0%, #f59e0b 25%, #d97706 75%, #92400e 100%)
              `
              : difficulty === "expert"
                ? `
                  radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                  radial-gradient(circle at 80% 80%, rgba(0, 0, 0, 0.15) 1px, transparent 1px),
                  radial-gradient(circle at 40% 60%, rgba(255, 255, 255, 0.05) 0.5px, transparent 0.5px),
                  linear-gradient(145deg, #fde68a 0%, #facc15 25%, #eab308 75%, #a16207 100%)
                `
                : difficulty === "master"
                  ? `
                    radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                    radial-gradient(circle at 80% 80%, rgba(0, 0, 0, 0.15) 1px, transparent 1px),
                    radial-gradient(circle at 40% 60%, rgba(255, 255, 255, 0.05) 0.5px, transparent 0.5px),
                    linear-gradient(145deg, #fb923c 0%, #f97316 25%, #ea580c 75%, #c2410c 100%)
                  `
                  : `
                    radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                    radial-gradient(circle at 80% 80%, rgba(0, 0, 0, 0.15) 1px, transparent 1px),
                    radial-gradient(circle at 40% 60%, rgba(255, 255, 255, 0.05) 0.5px, transparent 0.5px),
                    linear-gradient(145deg, #f87171 0%, #ef4444 25%, #dc2626 75%, #b91c1c 100%)
                  `,
        backgroundSize: disabled
          ? "auto"
          : "12px 12px, 16px 16px, 8px 8px, 100% 100%",

        // Inset shadows for 3D depth effect only
        boxShadow: disabled
          ? "none"
          : selected
            ? "inset -1px -1px 2px rgba(0, 0, 0, 0.1), inset 1px 1px 2px rgba(255, 255, 255, 0.8)"
            : "inset -1px -1px 2px rgba(0, 0, 0, 0.1), inset 1px 1px 2px rgba(255, 255, 255, 0.8)",
      }}
    >
      {/* Custom shadow element that follows the same clip-path */}
      <div
        className="absolute inset-0"
        style={{
          // Same clip-path as the main element
          clipPath: edgeVariation.replace("clip-path: ", "").replace(";", ""),
          // Light background for raised shadow effect
          background: disabled
            ? "rgba(255, 255, 255, 0.8)"
            : difficulty === "starter"
              ? `
                radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.2) 1px, transparent 1px),
                radial-gradient(circle at 80% 80%, rgba(0, 0, 0, 0.03) 1px, transparent 1px),
                radial-gradient(circle at 40% 60%, rgba(255, 255, 255, 0.15) 0.5px, transparent 0.5px),
                linear-gradient(145deg, #f8f8f7 0%, #f1f0ef 25%, #e8e6e3 75%, #d6d3d1 100%)
              `
              : difficulty === "junior"
                ? `
                  radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.2) 1px, transparent 1px),
                  radial-gradient(circle at 80% 80%, rgba(0, 0, 0, 0.03) 1px, transparent 1px),
                  radial-gradient(circle at 40% 60%, rgba(255, 255, 255, 0.15) 0.5px, transparent 0.5px),
                  linear-gradient(145deg, #fefbf3 0%, #fef7e6 25%, #fdecc8 75%, #fcd34d 100%)
                `
                : difficulty === "expert"
                  ? `
                    radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.2) 1px, transparent 1px),
                    radial-gradient(circle at 80% 80%, rgba(0, 0, 0, 0.03) 1px, transparent 1px),
                    radial-gradient(circle at 40% 60%, rgba(255, 255, 255, 0.15) 0.5px, transparent 0.5px),
                    linear-gradient(145deg, #fffef0 0%, #fefce8 25%, #fef3c7 75%, #fde68a 100%)
                  `
                  : difficulty === "master"
                    ? `
                      radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.2) 1px, transparent 1px),
                      radial-gradient(circle at 80% 80%, rgba(0, 0, 0, 0.03) 1px, transparent 1px),
                      radial-gradient(circle at 40% 60%, rgba(255, 255, 255, 0.15) 0.5px, transparent 0.5px),
                      linear-gradient(145deg, #fef7ed 0%, #fed7aa 25%, #fdba74 75%, #fb923c 100%)
                    `
                    : `
                      radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.2) 1px, transparent 1px),
                      radial-gradient(circle at 80% 80%, rgba(0, 0, 0, 0.03) 1px, transparent 1px),
                      radial-gradient(circle at 40% 60%, rgba(255, 255, 255, 0.15) 0.5px, transparent 0.5px),
                      linear-gradient(145deg, #fef5f5 0%, #fecaca 25%, #fca5a5 75%, #f87171 100%)
                    `,
          // Offset the shadow
          transform: disabled ? "translate(2px, 2px)" : "translate(3px, 4px)",
          // Slight blur effect
          filter: "blur(1px)",
          // Put shadow behind everything
          zIndex: -1,
        }}
      />

      {/* Stone surface with hieroglyph */}
      <span
        className="relative flex h-full w-full items-center justify-center font-mono select-none"
        style={{
          // Symbol color matches the darker tile background
          color: disabled
            ? "#6b7280"
            : difficulty === "starter"
              ? "#57534e"
              : difficulty === "junior"
                ? "#92400e"
                : difficulty === "expert"
                  ? "#a16207"
                  : difficulty === "master"
                    ? "#c2410c"
                    : "#b91c1c",
          // Subtle engraved effect for the symbol
          textShadow: disabled
            ? "none"
            : "0 1px 0 rgba(255, 255, 255, 0.8), 0 -1px 0 rgba(0, 0, 0, 0.3)",
          filter: selected ? "brightness(1.1)" : "none",
        }}
      >
        {symbol}
      </span>
    </div>
  )
}
