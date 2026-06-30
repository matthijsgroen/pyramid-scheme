/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { type FC, useCallback, useState } from "react"
import { registerPuzzle } from "@/game/puzzleRegistry"
import { mulberry32 } from "@/game/random"
import { generateCompareLevel, type CompareLevel } from "@/game/generateCompareLevel"
import type { PuzzleSettings } from "@/game/puzzlePlugin"
import type { Operation } from "@/app/Formulas/formulas"
import { formulaToString } from "@/app/Formulas/formulas"
import { NumberChest } from "@/ui/NumberChest"
import { Chest } from "@/ui/Chest"
import crocodileOpen from "@/assets/crocodile-250.png"
import crocodileClosed from "@/assets/crocodile-closed-250.png"
import clsx from "clsx"
import { useTranslation } from "react-i18next"

type CrocodileConfig = {
  compareAmount: number
  numberOfSymbols: number
  numberRange: [number, number]
  operators: Operation[]
  maxMultiplyOperandResult?: number
}

const CROC_CONFIG: Record<string, CrocodileConfig> = {
  starter: { compareAmount: 0, numberOfSymbols: 2, numberRange: [1, 5], operators: ["+"] },
  junior: { compareAmount: 2, numberOfSymbols: 3, numberRange: [1, 10], operators: ["+", "-"] },
  expert: {
    compareAmount: 3,
    numberOfSymbols: 4,
    numberRange: [1, 10],
    operators: ["+", "-", "*"],
    maxMultiplyOperandResult: 5,
  },
  master: {
    compareAmount: 4,
    numberOfSymbols: 4,
    numberRange: [1, 10],
    operators: ["+", "-", "*"],
    maxMultiplyOperandResult: 8,
  },
  wizard: {
    compareAmount: 5,
    numberOfSymbols: 5,
    numberRange: [1, 20],
    operators: ["+", "-", "*"],
    maxMultiplyOperandResult: 10,
  },
}

const scaleDistance = (initialStep: number, n: number) => initialStep * (1 - Math.pow(0.5, n))

const CrocodileComponent: FC<{ puzzle: CompareLevel; settings: PuzzleSettings; onSolved: () => void }> = ({
  puzzle,
  onSolved,
}) => {
  const { t } = useTranslation("common")
  const [focus, setFocus] = useState(0)
  const [answers, setAnswers] = useState<Record<number, "left" | "right" | "noneLeft" | "noneRight">>({})
  const [lockState, setLockState] = useState<"empty" | "error" | "open">("empty")
  const [lockValue, setLockValue] = useState("")
  const [processing, setProcessing] = useState(false)

  const hasComparison = puzzle.comparisons.length > 0

  const handleLeftClick = useCallback(() => {
    const active = puzzle.comparisons[focus]
    if (!active || active.left.result <= active.right.result) return
    const current = answers[focus] ?? "noneRight"
    if (!current.startsWith("none")) return
    const needsTurn = current !== "noneLeft"
    setAnswers(a => ({ ...a, [focus]: needsTurn ? "noneLeft" : "left" }))
    if (needsTurn) setTimeout(() => setAnswers(a => ({ ...a, [focus]: "left" })), 500)
    setTimeout(() => setFocus(f => f + 1), needsTurn ? 800 : 200)
  }, [focus, puzzle.comparisons, answers])

  const handleRightClick = useCallback(() => {
    const active = puzzle.comparisons[focus]
    if (!active || active.right.result <= active.left.result) return
    const current = answers[focus] ?? "noneLeft"
    if (!current.startsWith("none")) return
    const needsTurn = current !== "noneRight"
    setAnswers(a => ({ ...a, [focus]: needsTurn ? "noneRight" : "right" }))
    if (needsTurn) setTimeout(() => setAnswers(a => ({ ...a, [focus]: "right" })), 500)
    setTimeout(() => setFocus(f => f + 1), needsTurn ? 800 : 200)
  }, [focus, puzzle.comparisons, answers])

  const handleMouseOverLeft = useCallback(() => {
    setAnswers(a => {
      const cur = a[focus] ?? "noneRight"
      return cur.startsWith("none") ? { ...a, [focus]: "noneLeft" } : a
    })
  }, [focus])

  const handleMouseOverRight = useCallback(() => {
    setAnswers(a => {
      const cur = a[focus] ?? "noneLeft"
      return cur.startsWith("none") ? { ...a, [focus]: "noneRight" } : a
    })
  }, [focus])

  const handleIDontKnow = useCallback(() => {
    setFocus(0)
    setAnswers({})
  }, [])

  const handleLockSubmit = useCallback(
    (value: string) => {
      if (processing) return
      if (value !== puzzle.requirements.digit.toString()) {
        setLockState("error")
        setFocus(0)
        setAnswers({})
        return
      }
      setLockState("open")
      setProcessing(true)
      setTimeout(() => {
        onSolved()
        setProcessing(false)
      }, 1500)
    },
    [processing, puzzle.requirements.digit, onSolved]
  )

  const handleChestOpen = useCallback(() => {
    if (processing || lockState === "open") return
    setLockState("open")
    setProcessing(true)
    setTimeout(() => {
      onSolved()
      setProcessing(false)
    }, 1500)
  }, [processing, lockState, onSolved])

  return (
    <div
      className={clsx(
        "relative flex flex-1 flex-col-reverse items-center justify-center gap-4",
        hasComparison && "bg-gradient-to-b from-transparent from-50% via-blue-200 via-51% to-blue-100"
      )}
    >
      <div className="absolute top-0">
        {focus === 0 && hasComparison && (
          <h3 className="mx-8 mt-4 text-center text-lg font-bold text-amber-200">{t("tomb.crocodilePuzzlePrompt")}</h3>
        )}
      </div>
      <div
        className="absolute translate-y-0 scale-100 transition-transform duration-400"
        style={{
          "--tw-scale-x": `${Math.max(100 + (puzzle.comparisons.length - focus) * -20, 0)}%`,
          "--tw-scale-y": `${Math.max(100 + (puzzle.comparisons.length - focus) * -20, 0)}%`,
          "--tw-translate-y": `calc(1vh * ${-scaleDistance(8, puzzle.comparisons.length - focus)})`,
        }}
      >
        <h3
          className={clsx(
            "mb-2 text-lg font-bold text-amber-200 transition-opacity duration-400",
            focus !== puzzle.comparisons.length && "opacity-0"
          )}
        >
          {hasComparison
            ? t(`tomb.crocodilePuzzle${puzzle.requirements.largest === "always" ? "Always" : "Never"}`)
            : t("tomb.noCrocodilePuzzle")}
        </h3>
        {hasComparison && (
          <p className={clsx("text-sm text-amber-500 italic", focus !== puzzle.comparisons.length && "opacity-0")}>
            {t("tomb.crocodileDigitHint")}
          </p>
        )}
        {hasComparison && (
          <button
            className={clsx(
              "my-4 rounded-md border-2 border-amber-500 p-2 text-sm text-amber-500 active:scale-95",
              focus !== puzzle.comparisons.length && "opacity-0"
            )}
            onClick={handleIDontKnow}
          >
            {t("tomb.iDontKnow")}
          </button>
        )}
        {hasComparison ? (
          <div
            className={clsx(
              "grid grid-rows-[100px_1fr]",
              focus === puzzle.comparisons.length ? "brightness-100 saturate-100" : "brightness-110 saturate-30"
            )}
          >
            <div className="col-start-1 row-start-2 rounded-t-[50%] rounded-b-[30%] bg-amber-700" />
            <div className="col-start-1 row-span-2 row-start-1 px-4 pb-8">
              <NumberChest
                state={lockState}
                variant="vibrant"
                onSubmit={handleLockSubmit}
                value={lockValue}
                placeholder="1-9"
                onChange={setLockValue}
                disabled={focus !== puzzle.comparisons.length}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6">
            <Chest
              state={lockState}
              variant="muted"
              onClick={handleChestOpen}
              allowInteraction={!processing && lockState !== "open"}
            />
          </div>
        )}
      </div>
      {puzzle.comparisons
        .slice()
        .reverse()
        .map((comparison, reversedIndex) => {
          const index = puzzle.comparisons.length - 1 - reversedIndex
          const distanceFocus = index - focus
          const answered = answers[index] ?? "noneRight"
          const isMirrored = answered.endsWith("eft")
          const isClosed = !answered.startsWith("none")
          return (
            <div
              key={index}
              className={clsx(
                "absolute bottom-0 flex w-dvw max-w-md translate-y-0 scale-100 flex-col items-center transition-transform duration-400",
                index - focus < 0 && "blur-xs"
              )}
              style={{
                "--tw-translate-y": `calc(1vh * ${-scaleDistance(18, distanceFocus)})`,
                "--tw-scale-x": `${Math.max(Math.min(100 + distanceFocus * -20, 120), 0)}%`,
                "--tw-scale-y": `${Math.max(Math.min(100 + distanceFocus * -20, 120), 0)}%`,
              }}
            >
              <div className="flex w-full flex-1 flex-row justify-between gap-16 px-4">
                <button
                  className={clsx(
                    "animate-bounce cursor-pointer text-shadow-amber-800 text-shadow-md",
                    focus !== index && "opacity-0"
                  )}
                  onClick={focus === index ? handleLeftClick : undefined}
                  onMouseEnter={focus === index ? handleMouseOverLeft : undefined}
                >
                  {formulaToString(comparison.left, undefined, "no")}
                </button>
                <button
                  className={clsx(
                    "animate-bounce cursor-pointer text-shadow-amber-800 text-shadow-md",
                    focus !== index && "opacity-0"
                  )}
                  onMouseEnter={focus === index ? handleMouseOverRight : undefined}
                  onClick={focus === index ? handleRightClick : undefined}
                >
                  {formulaToString(comparison.right, undefined, "no")}
                </button>
              </div>
              <div className="flex-1">
                <img
                  src={isClosed ? crocodileClosed : crocodileOpen}
                  alt="crocodile"
                  className={clsx(
                    "animate-subtle-bounce transition-all delay-100 duration-200",
                    focus === index ? "brightness-100 saturate-100" : "brightness-110 saturate-30",
                    isMirrored ? "-scale-x-100" : "scale-x-100"
                  )}
                />
              </div>
            </div>
          )
        })}
    </div>
  )
}

registerPuzzle({
  family: "crocodile",
  generate: (seed, settings): CompareLevel => {
    const difficulty = settings.difficulty ?? "starter"
    const config = CROC_CONFIG[difficulty] ?? CROC_CONFIG.starter
    const random = mulberry32(seed)
    const digit = Math.round(random() * 9)
    const always = random() > 0.5
    return generateCompareLevel(
      {
        compareAmount: config.compareAmount,
        numberOfSymbols: config.numberOfSymbols,
        numberRange: config.numberRange,
        operators: config.operators,
        maxMultiplyOperandResult: config.maxMultiplyOperandResult,
      },
      { digit, largest: always ? "always" : "never" },
      random
    )
  },
  Component: CrocodileComponent as FC<{ puzzle: unknown; settings: PuzzleSettings; onSolved: () => void }>,
})

// re-export for type use
export type { CrocodileConfig }
