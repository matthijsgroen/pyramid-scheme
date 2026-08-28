import { useState, type FC } from "react"
import clsx from "clsx"
import type { Capacities, Move, Volumes } from "@/mods/puzzle/game/canisters/canisters"
import { Vessel } from "./Vessel"
import type { CanistersSkin } from "./skins"

type Props = {
  capacities: Capacities
  volumes: Volumes
  /** The canister the player has picked up, waiting for somewhere to pour it. */
  held?: number
  /** What the player has claimed, and whether it was right — the board answers, the canister never does. */
  claimed?: { canister: number; right: boolean; count: number }
  /** The pour the hint names, lit where it stands. */
  lit?: Move
  /** The completion run is under way, so what is in the canisters catches the light. */
  celebrating?: boolean
  /**
   * The pour just made, and how many have been made — so the same pour twice in a row still animates.
   *
   * Watched here rather than derived from the volumes, because a pour that fills a canister and one that
   * empties the source look the same afterwards and only one of them tipped.
   */
  lastPour?: { from: number; to: number; count: number }
  skin: CanistersSkin
  onHold: (canister: number) => void
  onPour: (to: number) => void
  /** The player says this canister holds the volume that was asked for. */
  onClaim: (canister: number) => void
}

/**
 * Which canister is tipping, and which way.
 *
 * **Set while rendering rather than from an effect**, which is what React asks for when state is derived
 * from a prop: an effect would run a second render for every pour. It is cleared by the animation saying
 * it finished rather than by a timer counting the same milliseconds the stylesheet already counts.
 *
 * **The pour's number is kept after it settles**, and that is not tidiness: cleared outright, the next
 * render sees a pour it has no record of and starts the tip again, forever.
 */
const useTipping = (lastPour: { from: number; to: number; count: number } | undefined) => {
  const [tip, setTip] = useState<{ from: number; to: number; count: number; running: boolean } | undefined>()
  if (lastPour !== undefined && lastPour.count !== tip?.count) setTip({ ...lastPour, running: true })
  return {
    tipping: tip?.running === true ? tip : undefined,
    settle: () => setTip(current => (current === undefined ? current : { ...current, running: false })),
  }
}

/**
 * The board's answer to a claim, played once and then let go.
 *
 * The same shape as `useTipping` and for the same reason — a claim's number is kept after its answer
 * finishes, or the next render re-arms it and the canister shakes forever.
 */
const useAnswer = (claimed: { canister: number; right: boolean; count: number } | undefined) => {
  const [answer, setAnswer] = useState<
    { canister: number; right: boolean; count: number; running: boolean } | undefined
  >()
  if (claimed !== undefined && claimed.count !== answer?.count) setAnswer({ ...claimed, running: true })
  return {
    answer: answer?.running === true ? answer : undefined,
    settle: () => setAnswer(current => (current === undefined ? current : { ...current, running: false })),
  }
}

/** The largest canister fills the bench; the rest stand in proportion to it. */
const HEIGHT = { max: 10, min: 4 }

/**
 * The least water a canister may be drawn with while holding any at all.
 *
 * One measure in a 14 is a twentieth of the vessel, and drawn honestly it disappears into the foot — so a
 * canister with something in it looked exactly like one that had run dry. That is the single reading a
 * pour has to leave behind (§7), so it gets a floor: still clearly less than anything else, never nothing.
 */
const MIN_VISIBLE = 0.08

/**
 * One canister: how big it is, and how much is in it.
 *
 * **The size is drawn to scale and written underneath.** A 5 beside an 8 has to LOOK like a 5 beside an
 * 8 — that proportion is what the player reasons with. The number sits under the shape rather than on it,
 * because inside an empty vessel there is nothing for it to be read against.
 *
 * **What is in it is never a number** (design doc §7). The level itself IS drawn, and it is not a shortcut
 * past the arithmetic: no board says how many measures a height is worth. What it does give is the one
 * reading a pour has to leave behind — which canister ran out, and so whether the pour was limited by what
 * you had or by what fits.
 */
const Canister: FC<{
  capacity: number
  volume: number
  tallest: number
  held: boolean
  lit: boolean
  celebrating: boolean
  /** -1, 0 or 1: which way this canister is tipping, if it is pouring right now. */
  tilt: number
  /** The tip has played out and the vessel is back on the bench. */
  onSettled: () => void
  /** The board's answer to a claim on THIS canister, while it is being given. */
  answered?: "yes" | "no"
  onAnswered: () => void
  skin: CanistersSkin
  onTap: () => void
}> = ({ capacity, volume, tallest, held, lit, celebrating, tilt, onSettled, answered, onAnswered, skin, onTap }) => {
  const rem = HEIGHT.min + (capacity / tallest) * (HEIGHT.max - HEIGHT.min)
  return (
    <button
      onClick={onTap}
      className="flex cursor-pointer flex-col items-center gap-1 rounded p-1 transition active:scale-95"
      // The number under the shape names this button for anyone reading it, but "8" on its own says
      // nothing about what it is.
      aria-label={`canister of ${capacity}`}
    >
      <div
        style={{
          height: `${rem}rem`,
          width: `${rem * 0.62}rem`,
          // Near the foot, so the vessel is tipped rather than spun (index.css's `pour`).
          transformOrigin: "50% 88%",
          ...(tilt !== 0 ? ({ "--tilt": tilt } as Record<string, number>) : {}),
        }}
        className={clsx(
          lit && skin.lit,
          "rounded",
          tilt !== 0 && "animate-pour",
          // A refused claim shakes the canister; an accepted one catches the light. Both animate, and not
          // only for the look: the board learns the answer is over from `animationend`, so an answer that
          // played nothing would never be cleared and its colour would stay for the rest of the board.
          answered === "no" && "animate-refuse",
          answered === "yes" && "animate-flare"
        )}
        onAnimationEnd={tilt !== 0 ? onSettled : answered !== undefined ? onAnswered : undefined}
      >
        <Vessel
          shape={skin.shape}
          settles={skin.settles}
          fill={volume === 0 ? 0 : Math.max(volume / capacity, MIN_VISIBLE)}
          // An accepted claim turns the water the colour a measured volume wears, for as long as the
          // answer lasts — the same green the completion run uses, because it means the same thing.
          liquid={celebrating === true || answered === "yes" ? skin.measured : skin.liquid}
          outline={held ? skin.held : skin.outline}
          tipping={tilt !== 0}
        />
      </div>
      <span className={clsx("text-lg leading-none font-semibold", skin.label)}>{capacity}</span>
    </button>
  )
}

export const CanistersBoard: FC<Props> = ({
  capacities,
  volumes,
  held,
  claimed,
  lit,
  celebrating,
  lastPour,
  skin,
  onHold,
  onPour,
  onClaim,
}) => {
  const tallest = Math.max(...capacities)
  const { tipping, settle } = useTipping(lastPour)
  const { answer, settle: settleAnswer } = useAnswer(claimed)
  return (
    <div className={clsx("flex w-full max-w-[min(52vh,26rem)] flex-col gap-3 rounded-xl p-4 select-none", skin.board)}>
      <div className="flex items-end justify-center gap-3">
        {capacities.map((capacity, canister) => (
          <div key={canister} className="flex flex-col items-center gap-2">
            <Canister
              capacity={capacity}
              volume={volumes[canister]}
              tallest={tallest}
              held={held === canister}
              lit={lit !== undefined && lit.from === canister}
              celebrating={celebrating === true}
              // Which way to tip: toward the canister being filled, so a pour to the right rolls right.
              tilt={tipping !== undefined && tipping.from === canister ? Math.sign(tipping.to - canister) : 0}
              onSettled={settle}
              answered={answer?.canister === canister ? (answer.right ? "yes" : "no") : undefined}
              onAnswered={settleAnswer}
              skin={skin}
              // A held canister pours into the one tapped next; an unheld one is picked up. One gesture,
              // two meanings, and which it is is always visible from the outline.
              onTap={() => (held !== undefined && held !== canister ? onPour(canister) : onHold(canister))}
            />
            {/* Claiming is a move of its own, and a wrong one costs like any other (design doc §6). It
                answers to the touch, because a button that costs a move and looks inert reads as broken —
                and this is the one control on the board a player hesitates over. */}
            <button
              onClick={() => onClaim(canister)}
              className={clsx(
                "cursor-pointer rounded border px-2 py-1 text-xs transition active:scale-95",
                answer?.canister === canister &&
                  answer.right &&
                  "border-emerald-400 bg-emerald-900/40 text-emerald-200",
                answer?.canister === canister && !answer.right && "border-rose-400 bg-rose-950/40 text-rose-200",
                answer?.canister !== canister &&
                  "border-stone-600 text-stone-300 hover:border-stone-400 hover:bg-stone-700/40 hover:text-stone-100"
              )}
              aria-label={`claim the ${capacity} holds it`}
            >
              this one
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
