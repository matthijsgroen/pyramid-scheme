import type { FC } from "react"
// ponytail: a src/ui atom importing a trap-mod type — acceptable for now (a display-only vocab
// import, not a runtime dependency); revisit if the ui/mod boundary needs hardening.
import type { ConsumableType } from "@/mods/trap/game/consumableTypes"

const EMOJI: Record<ConsumableType, string> = {
  bandage: "🩹",
  oil: "🫙",
  trapTool: "🔧",
}

type Props = {
  consumables: { bandage: number; oil: number; trapTool: number }
}

const Item: FC<{ type: ConsumableType; count: number }> = ({ type, count }) =>
  count <= 0 ? null : (
    <span className="flex items-center gap-0.5 text-sm text-amber-200">
      <span aria-hidden>{EMOJI[type]}</span>
      <span>{count}</span>
    </span>
  )

export const ConsumableBar: FC<Props> = ({ consumables }) => {
  const total = consumables.bandage + consumables.oil + consumables.trapTool
  if (total === 0) return null
  return (
    <div
      className="flex gap-2"
      role="img"
      aria-label={`Consumables: ${consumables.bandage} bandage, ${consumables.oil} oil, ${consumables.trapTool} trap tool`}
    >
      <Item type="bandage" count={consumables.bandage} />
      <Item type="oil" count={consumables.oil} />
      <Item type="trapTool" count={consumables.trapTool} />
    </div>
  )
}
