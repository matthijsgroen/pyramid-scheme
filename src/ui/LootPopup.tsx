import { type FC, type ReactNode, useEffect, useState } from "react"
import clsx from "clsx"
import { useTranslation } from "react-i18next"

type LootPopupProps = {
  isOpen: boolean
  itemName: string
  itemDescription?: string
  itemComponent: ReactNode
  onDismiss: () => void
  rarity?: "common" | "rare" | "epic" | "legendary"
}

export const LootPopup: FC<LootPopupProps> = ({
  isOpen,
  itemName,
  itemDescription,
  itemComponent,
  onDismiss,
  rarity = "common",
}) => {
  const { t } = useTranslation("common")
  const [showContent, setShowContent] = useState(false)
  const [animationPhase, setAnimationPhase] = useState<
    "hidden" | "burst" | "reveal" | "visible"
  >("hidden")

  useEffect(() => {
    if (isOpen) {
      setAnimationPhase("burst")

      // Burst effect duration
      const burstTimer = setTimeout(() => {
        setAnimationPhase("reveal")
        setShowContent(true)
      }, 300)

      // Full reveal duration
      const revealTimer = setTimeout(() => {
        setAnimationPhase("visible")
      }, 800)

      return () => {
        clearTimeout(burstTimer)
        clearTimeout(revealTimer)
      }
    } else {
      setAnimationPhase("hidden")
      setShowContent(false)
    }
  }, [isOpen])

  const handleDismiss = () => {
    setAnimationPhase("hidden")
    setTimeout(() => {
      onDismiss()
      setShowContent(false)
    }, 200)
  }

  if (!isOpen && animationPhase === "hidden") return null

  const rarityColors = {
    common: {
      bg: "from-gray-400 to-gray-600",
      glow: "shadow-gray-400/50",
      text: "text-gray-100",
      accent: "text-gray-200",
    },
    rare: {
      bg: "from-blue-400 to-blue-600",
      glow: "shadow-blue-400/50",
      text: "text-blue-100",
      accent: "text-blue-200",
    },
    epic: {
      bg: "from-purple-400 to-purple-600",
      glow: "shadow-purple-400/50",
      text: "text-purple-100",
      accent: "text-purple-200",
    },
    legendary: {
      bg: "from-yellow-400 to-orange-500",
      glow: "shadow-yellow-400/50",
      text: "text-yellow-100",
      accent: "text-yellow-200",
    },
  }

  const colors = rarityColors[rarity]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop with animation */}
      <div
        className={clsx("absolute inset-0 transition-all duration-500", {
          "bg-black/0": animationPhase === "hidden",
          "bg-black/10": animationPhase === "burst",
          "bg-black/30":
            animationPhase === "reveal" || animationPhase === "visible",
        })}
        onClick={animationPhase === "visible" ? handleDismiss : undefined}
      />

      {/* Burst effect */}
      {animationPhase === "burst" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-ping">
            <div
              className={`h-32 w-32 rounded-full bg-gradient-to-r ${colors.bg} opacity-75`}
            />
          </div>
          <div className="absolute animate-pulse">
            <div
              className={`h-48 w-48 rounded-full bg-gradient-to-r ${colors.bg} opacity-50`}
            />
          </div>
        </div>
      )}

      {/* Main popup */}
      <div
        className={clsx(
          "pointer-events-none relative z-10 mx-4 w-full max-w-md transition-all duration-500",
          {
            "scale-0 opacity-0": animationPhase === "hidden",
            "scale-75 opacity-30": animationPhase === "burst",
            "scale-110 opacity-90": animationPhase === "reveal",
            "scale-100 opacity-100": animationPhase === "visible",
          }
        )}
      >
        <div
          className={clsx(
            "relative rounded-2xl bg-gradient-to-br p-8 shadow-2xl transition-all duration-500",
            colors.bg,
            colors.glow,
            {
              "shadow-lg": animationPhase === "reveal",
              "shadow-2xl animate-subtle-glow": animationPhase === "visible",
            }
          )}
        >
          {/* Sparkle effects */}
          {(animationPhase === "reveal" || animationPhase === "visible") && (
            <>
              <div className="absolute -top-2 -left-2 h-4 w-4 animate-bounce text-yellow-300">
                ✨
              </div>
              <div className="absolute -top-1 -right-3 h-3 w-3 animate-bounce text-yellow-300 delay-100">
                ⭐
              </div>
              <div className="absolute -bottom-2 -left-3 h-3 w-3 animate-bounce text-yellow-300 delay-200">
                💫
              </div>
              <div className="absolute -right-2 -bottom-1 h-4 w-4 animate-bounce text-yellow-300 delay-300">
                ✨
              </div>
            </>
          )}

          {/* Content */}
          {showContent && (
            <div className="text-center">
              <h2
                className={clsx(
                  "mb-4 font-pyramid text-2xl font-bold transition-all duration-300",
                  colors.text,
                  {
                    "scale-90 opacity-0": animationPhase === "reveal",
                    "scale-100 opacity-100": animationPhase === "visible",
                  }
                )}
              >
                {t("loot.youFound")}
              </h2>

              {/* Item display area */}
              <div
                className={clsx(
                  "mb-6 flex justify-center transition-all delay-200 duration-500",
                  {
                    "scale-50 opacity-0": animationPhase === "reveal",
                    "scale-100 opacity-100": animationPhase === "visible",
                  }
                )}
              >
                <div className="relative">
                  {/* Glow effect behind item */}
                  <div
                    className={clsx(
                      "absolute inset-0 rounded-full blur-md transition-all duration-1000",
                      colors.bg,
                      {
                        "scale-0 opacity-0": animationPhase === "reveal",
                        "scale-150 opacity-30": animationPhase === "visible",
                      }
                    )}
                  />
                  <div
                    className={clsx("relative", {
                      "animate-gentle-bounce": animationPhase === "visible",
                    })}
                  >
                    {itemComponent}
                  </div>
                </div>
              </div>

              {/* Item name */}
              <h3
                className={clsx(
                  "mb-4 font-pyramid text-xl font-bold transition-all delay-300 duration-500",
                  colors.accent,
                  {
                    "translate-y-4 opacity-0": animationPhase === "reveal",
                    "translate-y-0 opacity-100": animationPhase === "visible",
                  }
                )}
              >
                {itemName}
              </h3>

              {/* Item description */}
              {itemDescription && (
                <p
                  className={clsx(
                    "mb-6 text-sm leading-relaxed transition-all delay-400 duration-500",
                    colors.text,
                    {
                      "translate-y-4 opacity-0": animationPhase === "reveal",
                      "translate-y-0 opacity-100": animationPhase === "visible",
                    }
                  )}
                >
                  {itemDescription}
                </p>
              )}

              {/* Dismiss instruction */}
              {animationPhase === "visible" && (
                <p
                  className={clsx(
                    "animate-pulse text-sm font-medium",
                    colors.text
                  )}
                >
                  {t("loot.clickToContinue")}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
