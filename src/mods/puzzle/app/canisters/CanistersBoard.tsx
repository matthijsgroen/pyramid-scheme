import type { FC } from "react"
import clsx from "clsx"
import type { Capacities, Move, Volumes } from "@/mods/puzzle/game/canisters/canisters"
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
  skin: CanistersSkin
  onHold: (canister: number) => void
  onPour: (to: number) => void
  /** The player says this canister holds the volume that was asked for. */
  onClaim: (canister: number) => void
}

/** The tallest canister fills the bench; the rest stand in proportion to it. */
const HEIGHT = { max: 11, min: 3 }

/**
 * One canister: how big it is, and how much is in it.
 *
 * **The size is drawn to scale and written on it.** A 5 beside an 8 has to LOOK like a 5 beside an 8 —
 * that proportion is what the player reasons with, and two canisters drawn the same height while claiming
 * different numbers makes the board argue with itself.
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
  skin: CanistersSkin
  onTap: () => void
}> = ({ capacity, volume, tallest, held, lit, celebrating, levels, skin, onTap }) => {
  const rem = HEIGHT.min + (capacity / tallest) * (HEIGHT.max - HEIGHT.min)
  return (
    <button
      onClick={onTap}
      style={{ height: `${rem}rem` }}
      className={clsx(
        "relative flex w-20 flex-col justify-end overflow-hidden rounded-t-md rounded-b-xl border-2 transition-colors",
        held ? skin.held : skin.vessel,
        lit && skin.lit
      )}
      // Only the capacity: a screen reader is told exactly what a sighted player is shown, and the amount
      // is not a number on this board.
      aria-label={`canister of ${capacity}`}
    >
      <div
        className={clsx(
          "w-full transition-[height] duration-300",
          celebrating ? skin.measured : skin.liquid,
          // A part-full canister whose amount is withheld says so: the surface is hatched, so it reads as
          // "some, and not saying" rather than as a level that happens to sit halfway.
          levels === "sensed" && volume > 0 && volume < capacity && skin.uncertain
        )}
        style={{
          height:
            levels === "shown"
              ? `${(volume / capacity) * 100}%`
              : volume === 0
                ? "0%"
                : volume === capacity
                  ? "100%"
                  : "45%",
        }}
      />
      <span className="absolute inset-x-0 top-1 text-center text-lg font-semibold opacity-80">{capacity}</span>
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
  skin,
  onHold,
  onPour,
  onClaim,
}) => {
  const tallest = Math.max(...capacities)
  return (
    <div className={clsx("flex w-full max-w-[min(52vh,26rem)] flex-col gap-3 rounded-xl p-4 select-none", skin.board)}>
      <div className="flex items-end justify-center gap-4">
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
              skin={skin}
              // A held canister pours into the one tapped next; an unheld one is picked up. One gesture,
              // two meanings, and which it is is always visible from the ring.
              onTap={() => (held !== undefined && held !== canister ? onPour(canister) : onHold(canister))}
            />
            {/* Claiming is a move of its own, and a wrong one costs like any other (design doc §6). */}
            <button
              onClick={() => onClaim(canister)}
              className={clsx(
                "rounded border px-2 py-1 text-xs",
                claimed?.canister === canister && !claimed.right ? "border-rose-400 text-rose-300" : skin.vessel
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
