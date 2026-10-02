import type { FC, ReactNode } from "react"
import clsx from "clsx"

export type GateFaceMarker = {
  id: string
  /** The owner's own icon, drawn by the caller. */
  icon: ReactNode
  lit: boolean
  /** What the marker says to a screen reader, lit or not. */
  label: string
}

export type GateFaceOrderTile = {
  id: string
  /** The glyph the tile wears. */
  glyph: string
  status: "unwalked" | "inOrder" | "outOfOrder"
  /** What the tile says to a screen reader: its place in the order and how the run stands on it. */
  label: string
}

/** A sequence the door waits on: its tiles in the order to be walked, and the way to start again. */
export type GateFaceOrder = {
  id: string
  tiles: readonly GateFaceOrderTile[]
  /** Said while the run is spoiled. */
  note?: string
  reset?: { label: string; onReset: () => void }
}

const tileLook: Record<GateFaceOrderTile["status"], string> = {
  unwalked: "border-stone-500 bg-stone-900 text-stone-300",
  inOrder: "border-emerald-400 bg-emerald-950 text-emerald-200",
  outOfOrder: "border-red-500 bg-red-950 text-red-200",
}

type GateFacePanelProps = {
  title: string
  hint: string
  markers: readonly GateFaceMarker[]
  /** Each sequence the door waits on, in the order it is walked. */
  orders?: readonly GateFaceOrder[]
  turnAroundLabel: string
  onTurnAround: () => void
}

// What a door waits for: one marker per owner, bright once that owner has been worked and dim until then.
// It only offers to turn around — nothing here can open the door.
export const GateFacePanel: FC<GateFacePanelProps> = ({
  title,
  hint,
  markers,
  orders = [],
  turnAroundLabel,
  onTurnAround,
}) => (
  <div className="fixed inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-black/85">
    <p className="font-pyramid text-2xl text-amber-300">{title}</p>
    <p className="max-w-xs text-center text-sm text-stone-400 italic">{hint}</p>
    {markers.length > 0 && (
      <ul className="flex flex-wrap items-center justify-center gap-4">
        {markers.map(marker => (
          <li
            key={marker.id}
            aria-label={marker.label}
            data-lit={marker.lit}
            className={clsx(
              "flex size-16 items-center justify-center rounded-full border-2 text-4xl",
              marker.lit
                ? "border-amber-300 bg-amber-900/60 shadow-[0_0_14px_rgba(252,211,77,0.6)]"
                : "border-stone-600 bg-stone-900 opacity-40 grayscale"
            )}
          >
            {marker.icon}
          </li>
        ))}
      </ul>
    )}
    {orders.map(order => (
      <div key={order.id} className="flex flex-col items-center gap-3">
        <ol className="flex flex-wrap items-center justify-center gap-3">
          {order.tiles.map(tile => (
            <li
              key={tile.id}
              aria-label={tile.label}
              data-status={tile.status}
              className={clsx(
                "flex size-14 items-center justify-center rounded border-2 text-3xl",
                tileLook[tile.status]
              )}
            >
              {tile.glyph}
            </li>
          ))}
        </ol>
        {order.note && <p className="text-sm text-red-300">{order.note}</p>}
        {order.reset && (
          <button
            onClick={order.reset.onReset}
            className="rounded border border-amber-400 px-3 py-1 text-sm text-amber-200 hover:bg-amber-900/50"
          >
            {order.reset.label}
          </button>
        )}
      </div>
    ))}
    <button onClick={onTurnAround} className="text-sm text-stone-400 hover:text-stone-200">
      {turnAroundLabel}
    </button>
  </div>
)
