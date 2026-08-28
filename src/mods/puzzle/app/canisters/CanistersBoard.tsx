import { useState, type FC } from "react"
import clsx from "clsx"
import type { Capacities, Move, Volumes } from "@/mods/puzzle/game/canisters/canisters"
import { Amphora } from "./Amphora"
import type { CanistersSkin } from "./skins"

type Props = {
  capacities: Capacities
  volumes: Volumes
  /** The canister the player has picked up, waiting for somewhere to pour it. */
  held?: number
  /** What the player has claimed, and whether it was right — the board says so, the canister never does. */
  claimed?: { canister: number; right: boolean }
  /** The pour the hint names, lit where it stands. */
  lit?: Move
  /** The completion run is under way, so what is in the canisters catches the light. */
  celebrating?: boolean
  /** Whether the level is drawn to scale, or only as empty / part-full / full (`canistersConfig.ts`). */
  levels: "shown" | "sensed"
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

/** The largest canister fills the bench; the rest stand in proportion to it. */
const HEIGHT = { max: 10, min: 4 }

/**
 * One canister: how big it is, and how much is in it.
 *
 * **The size is drawn to scale and written underneath.** A 5 beside an 8 has to LOOK like a 5 beside an
 * 8 — that proportion is what the player reasons with. The number sits under the shape rather than on it,
 * because inside an empty vessel there is nothing for it to be read against.
 *
 * **What is in it is never a number** (design doc §7). How much of the level is drawn is the tier's call:
 * `shown` draws it to scale, `sensed` only says empty, part-full or full — which keeps the one reading a
 * pour has to give, since which canister ran out is what tells you what limited it.
 */
const Canister: FC<{
  capacity: number
  volume: number
  tallest: number
  held: boolean
  lit: boolean
  celebrating: boolean
  levels: "shown" | "sensed"
  /** -1, 0 or 1: which way this canister is tipping, if it is pouring right now. */
  tilt: number
  /** The tip has played out and the vessel is back on the bench. */
  onSettled: () => void
  skin: CanistersSkin
  onTap: () => void
}> = ({ capacity, volume, tallest, held, lit, celebrating, levels, tilt, onSettled, skin, onTap }) => {
  const rem = HEIGHT.min + (capacity / tallest) * (HEIGHT.max - HEIGHT.min)
  const fill = levels === "shown" ? volume / capacity : volume === 0 ? 0 : volume === capacity ? 1 : 0.45
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
        className={clsx(lit && skin.lit, "rounded", tilt !== 0 && "animate-pour")}
        onAnimationEnd={tilt !== 0 ? onSettled : undefined}
      >
        <Amphora
          fill={fill}
          liquid={celebrating ? skin.measured : skin.liquid}
          outline={held ? skin.held : skin.outline}
          uncertain={levels === "sensed" && volume > 0 && volume < capacity ? skin.uncertain : undefined}
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
  levels,
  lastPour,
  skin,
  onHold,
  onPour,
  onClaim,
}) => {
  const tallest = Math.max(...capacities)
  const { tipping, settle } = useTipping(lastPour)
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
              levels={levels}
              // Which way to tip: toward the canister being filled, so a pour to the right rolls right.
              tilt={tipping !== undefined && tipping.from === canister ? Math.sign(tipping.to - canister) : 0}
              onSettled={settle}
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
                claimed?.canister === canister && !claimed.right
                  ? "border-rose-400 text-rose-300 hover:border-rose-300 hover:text-rose-200"
                  : "border-stone-600 text-stone-300 hover:border-stone-400 hover:bg-stone-700/40 hover:text-stone-100"
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
