import { LootPopup } from "@/ui/LootPopup"
import { useTranslation } from "react-i18next"
import type { JourneyState } from "../state/useJourneys"
import { useTreasureItem } from "@/data/useTreasureTranslations"
import { Chest } from "@/ui/Chest"
import { NumberChest } from "@/ui/NumberChest"
import crocodileOpen from "@/assets/crocodile-250.png"
import crocodileClosed from "@/assets/crocodile-closed-250.png"
import clsx from "clsx"
import { formulaPartToString } from "@/game/formulas"
import { useCrocodilePuzzleControls } from "./useComparePuzzleControls"
import type { FC } from "react"

const scaleDistance = (n: number) => 64 * (1 - Math.pow(0.5, n))

export const ComparePuzzle: FC<{
  onComplete?: () => void
  activeJourney: JourneyState
  runNumber: number
}> = ({ onComplete, activeJourney, runNumber }) => {
  const { t } = useTranslation("common")
  const getTreasureItem = useTreasureItem()

  const {
    answers,
    focus,
    handleChestOpen,
    handleLeftClick,
    handleLockSubmit,
    handleLootDismiss,
    handleMouseOverLeft,
    handleMouseOverRight,
    handleRightClick,
    hasComparison,
    isProcessingCompletion,
    levelData,
    lockState,
    lockValue,
    lootId,
    setLockValue,
    showLoot,
  } = useCrocodilePuzzleControls({
    activeJourney,
    runNumber,
    onComplete,
  })
  const loot = getTreasureItem(lootId)

  return (
    <div
      className={clsx(
        "relative flex flex-1  flex-col-reverse items-center justify-center gap-4",
        hasComparison &&
          "bg-gradient-to-b from-transparent from-50% via-blue-200 via-51% to-blue-100"
      )}
    >
      <div className="absolute top-0">
        {focus === 0 && (
          <h3 className="mx-8 mt-4 text-center text-lg font-bold text-amber-200">
            {t("tomb.crocodilePuzzlePrompt")}
          </h3>
        )}
      </div>
      <div
        className="absolute scale-100 transition-transform duration-400"
        style={{
          "--tw-scale-x": `${Math.max(100 + (levelData.comparisons.length - focus) * -20, 0)}%`,
          "--tw-scale-y": `${Math.max(100 + (levelData.comparisons.length - focus) * -20, 0)}%`,
        }}
      >
        <h3
          className={clsx(
            "text-lg font-bold text-amber-200 transition-opacity duration-400",
            focus !== levelData.comparisons.length && "opacity-0"
          )}
        >
          {hasComparison
            ? t(
                `tomb.crocodilePuzzle${levelData.requirements.largest === "always" ? "Always" : "Never"}`
              )
            : t("tomb.noCrocodilePuzzle")}
        </h3>
        {hasComparison && (
          <p className="text-sm text-amber-500 italic">
            {t("tomb.crocodileDigitHint")}
          </p>
        )}
        {hasComparison ? (
          <div
            className={clsx(
              "grid grid-rows-[100px_1fr]",
              focus === levelData.comparisons.length
                ? "brightness-100 saturate-100"
                : "brightness-110 saturate-30"
            )}
          >
            <div className="col-start-1 row-start-2 rounded-t-[50%] rounded-b-[30%] bg-amber-700"></div>
            <div className="col-start-1 row-span-2 row-start-1 px-4 pb-8">
              <NumberChest
                state={lockState}
                variant="vibrant"
                onSubmit={handleLockSubmit}
                value={lockValue}
                placeholder="1-9"
                onChange={setLockValue}
                disabled={focus !== levelData.comparisons.length}
              />
            </div>
          </div>
        ) : (
          <Chest
            state={lockState}
            variant="muted"
            onClick={handleChestOpen}
            allowInteraction={!isProcessingCompletion && lockState !== "open"}
          />
        )}
      </div>
      {levelData.comparisons
        .slice()
        .reverse()
        .map((comparison, reversedIndex) => {
          const index = levelData.comparisons.length - 1 - reversedIndex
          const distanceFocus = index - focus
          const answered = answers[index] || "noneRight"
          const isMirrored = answered.endsWith("eft")
          const isClosed = !answered.startsWith("none")

          return (
            <div
              className={clsx(
                "absolute bottom-0 flex w-dvw max-w-md translate-y-0 scale-100 flex-col items-center transition-transform duration-400",
                index - focus < 0 && "blur-xs"
              )}
              style={{
                "--tw-translate-y": `calc(var(--spacing) * ${-scaleDistance(distanceFocus)})`,
                "--tw-scale-x": `${Math.max(Math.min(100 + distanceFocus * -20, 120), 0)}%`,
                "--tw-scale-y": `${Math.max(Math.min(100 + distanceFocus * -20, 120), 0)}%`,
              }}
              key={index}
            >
              <div className="flex w-full flex-1 flex-row justify-between gap-16 px-4">
                <button
                  className={clsx(
                    "animate-bounce cursor-pointer text-shadow-amber-800 text-shadow-md",
                    focus !== index && "opacity-0"
                  )}
                  onClick={focus === index ? handleLeftClick : undefined}
                  onMouseEnter={
                    focus === index ? handleMouseOverLeft : undefined
                  }
                >
                  {formulaPartToString(comparison.left)}
                </button>
                <button
                  className={clsx(
                    "animate-bounce cursor-pointer text-shadow-amber-800 text-shadow-md",
                    focus !== index && "opacity-0"
                  )}
                  onMouseEnter={
                    focus === index ? handleMouseOverRight : undefined
                  }
                  onClick={focus === index ? handleRightClick : undefined}
                >
                  {formulaPartToString(comparison.right)}
                </button>
              </div>
              <div className="flex-1">
                <img
                  src={isClosed ? crocodileClosed : crocodileOpen}
                  alt="crocodile"
                  className={clsx(
                    "animate-subtle-bounce transition-all delay-100 duration-200",
                    focus === index
                      ? "brightness-100 saturate-100"
                      : "brightness-110 saturate-30",
                    isMirrored ? "-scale-x-100" : "scale-x-100"
                  )}
                />
              </div>
            </div>
          )
        })}
      {loot && (
        <>
          <LootPopup
            isOpen={showLoot}
            itemName={loot.name}
            itemDescription={loot.description}
            itemComponent={loot.symbol}
            rarity={"legendary"}
            onDismiss={handleLootDismiss}
          />
        </>
      )}
    </div>
  )
}
