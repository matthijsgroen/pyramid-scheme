import { KEY_COLORS, type FloorGrid, type KeyColor, type TombKeyReward } from "./siteTypes"

export type FloorKeyRing = {
  /** Colours whose key chest on this floor is already opened — the keys the player carries here. */
  held: KeyColor[]
  /** Colours of doors the player has SEEN on this floor and cannot open yet. */
  needed: KeyColor[]
}

const sortByPresentationOrder = (colors: Set<KeyColor>): KeyColor[] => KEY_COLORS.filter(c => colors.has(c))

// Floor keys are floor-local: the chest that holds one and the door it opens sit on the same floor,
// and a key is "held" the moment its chest is opened (nothing consumes it). So the grid itself is
// the whole truth — which key chests are completed, and which floor-key doors are still shut.
//
// Gate satisfaction is by key id, never by colour: the colour is the sign the door wears so the
// player can tell which chest to look for. Two doors may share a hue and still want different keys.
export const floorKeyRing = (grid: FloorGrid, ownedKeys: ReadonlySet<string>): FloorKeyRing => {
  const held = new Set<KeyColor>()
  const needed = new Set<KeyColor>()

  for (const row of grid.cells) {
    for (const cell of row) {
      if (cell.type !== "room") continue
      const colors = cell.keyColors ?? (cell.keyColor ? [cell.keyColor] : [])

      // A key host: a chest whose tombKey reward opens this floor's doors of these colours.
      if (cell.reward?.type === "tombKey" && colors.length > 0) {
        if (ownedKeys.has((cell.reward as TombKeyReward).keyId)) for (const color of colors) held.add(color)
        continue
      }

      // A door. Fogged ones stay secret — surfacing their colour would spoil layout the player
      // hasn't discovered yet.
      if (cell.gateVariant === "floor-key" && cell.state !== "fogged") {
        const satisfied = !cell.requiredKeyId || ownedKeys.has(cell.requiredKeyId)
        if (!satisfied) for (const color of colors) needed.add(color)
      }
    }
  }

  // A colour in hand outranks a door still shut in that colour (a second door, a second key).
  for (const color of held) needed.delete(color)

  return { held: sortByPresentationOrder(held), needed: sortByPresentationOrder(needed) }
}
