import { sidePath } from "../dsl"
import type { FloorConstraint, Rule } from "../dsl"

// A CHEST ON EVERY FLOOR OF A TOMB: one ungated side path of one puzzle ending in loot, glass of the tomb's own
// tier while its register has room, coins after. Applied to every tomb rule that writes out its floors, the cave
// included, so no tomb is left out by being authored in another file.
const FLOOR_CHEST = sidePath({ puzzles: 1, endReward: "mosaicPiece" })

const withChest = <F extends FloorConstraint | null>(floor: F): F =>
  floor === null
    ? floor
    : {
        ...floor,
        sideSections: [...(Array.isArray(floor.sideSections) ? floor.sideSections : []), FLOOR_CHEST],
      }

const isTomb = (rule: Rule) => "journey" in rule.scope && rule.scope.journey.includes("_treasure_tomb")

export const withTombFloorChests = (rules: Rule[]): Rule[] =>
  rules.map(rule => {
    const { floors } = rule.constraints as { floors?: (FloorConstraint | null)[] }
    return isTomb(rule) && floors
      ? { ...rule, constraints: { ...rule.constraints, floors: floors.map(withChest) } }
      : rule
  })
