import type { FC } from "react"
import clsx from "clsx"
import type { Capacities, Move, Volumes } from "@/mods/puzzle/game/canisters/canisters"
import type { CanistersSkin } from "./skins"

type Props = {
  capacities: Capacities
  volumes: Volumes
  /** The canister the player has picked up, waiting for somewhere to pour it. */
  held?: 0 | 1
  /** What the player has claimed, and whether it was right — the board says so, the vessel never does. */
  claimed?: { canister: 0 | 1; right: boolean }
  /** The move the hint names, lit where it stands. */
  lit?: Move
  /** The completion run is under way, so what is in the vessels catches the light. */
  celebrating?: boolean
  skin: CanistersSkin
  onHold: (canister: 0 | 1) => void
  onPour: (to: 0 | 1) => void
  onFill: (canister: 0 | 1) => void
  onEmpty: (canister: 0 | 1) => void
  /** The player says this vessel holds the volume that was asked for. */
  onClaim: (canister: 0 | 1) => void
}

const litFor = (move: Move | undefined, canister: 0 | 1): boolean => {
  if (move === undefined) return false
  return move.kind === "pour" ? move.from === canister : move.canister === canister
}

/**
 * One vessel: its wall, what is in it, and the number that says how much it holds.
 *
 * **The capacity is written on it. What is in it is NOT** (design doc §7). The level is drawn, because
 * which vessel ran out is what a pour tells you — but the amount is never a number, so the player carries
 * it themselves. That is the arithmetic this family is for, and a board that printed the answer on the
 * glass would be asking nobody to do it.
 */
const Vessel: FC<{
  capacity: number
  volume: number
  held: boolean
  lit: boolean
  celebrating: boolean
  skin: CanistersSkin
  onTap: () => void
}> = ({ capacity, volume, held, lit, celebrating, skin, onTap }) => (
  <button
    onClick={onTap}
    className={clsx(
      "relative flex h-40 w-24 flex-col justify-end overflow-hidden rounded-t-md rounded-b-xl border-2 transition-colors",
      held ? skin.held : skin.vessel,
      lit && skin.lit
    )}
    // Only the capacity: a screen reader is told exactly what a sighted player is shown, and the level
    // is not a number on this board.
    aria-label={`canister of ${capacity}`}
  >
    <div
      className={clsx("w-full transition-[height] duration-300", celebrating ? skin.measured : skin.liquid)}
      style={{ height: `${(volume / capacity) * 100}%` }}
    />
    <span className="absolute inset-x-0 top-1 text-center text-lg font-semibold opacity-80">{capacity}</span>
  </button>
)

export const CanistersBoard: FC<Props> = ({
  capacities,
  volumes,
  held,
  claimed,
  lit,
  celebrating,
  skin,
  onHold,
  onPour,
  onFill,
  onEmpty,
  onClaim,
}) => (
  <div className={clsx("flex w-full max-w-[min(52vh,24rem)] flex-col gap-3 rounded-xl p-4 select-none", skin.board)}>
    <div className="flex items-end justify-center gap-6">
      {([0, 1] as const).map(canister => (
        <div key={canister} className="flex flex-col items-center gap-2">
          <Vessel
            capacity={capacities[canister]}
            volume={volumes[canister]}
            held={held === canister}
            lit={litFor(lit, canister)}
            celebrating={celebrating === true}
            skin={skin}
            // A held canister poured into the other one; an unheld one is picked up. One gesture, two
            // meanings, and which it is is always visible from the ring.
            onTap={() => (held !== undefined && held !== canister ? onPour(canister) : onHold(canister))}
          />
          <div className="flex gap-1">
            <button
              onClick={() => onFill(canister)}
              className={clsx("rounded px-2 py-1 text-xs", skin.source)}
              aria-label={`fill the ${capacities[canister]}`}
            >
              ▲ fill
            </button>
            <button
              onClick={() => onEmpty(canister)}
              className={clsx("rounded px-2 py-1 text-xs", skin.drain)}
              aria-label={`empty the ${capacities[canister]}`}
            >
              ▼ empty
            </button>
          </div>
          {/* Claiming is a move of its own, and a wrong one costs like any other (design doc §6). */}
          <button
            onClick={() => onClaim(canister)}
            className={clsx(
              "rounded border px-2 py-1 text-xs",
              claimed?.canister === canister && !claimed.right ? "border-rose-400 text-rose-300" : skin.vessel
            )}
            aria-label={`claim the ${capacities[canister]} holds it`}
          >
            this one
          </button>
        </div>
      ))}
    </div>
  </div>
)
