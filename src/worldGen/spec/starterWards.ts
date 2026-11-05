import { journey } from "../dsl"
import type { Rule, WardPathSpec } from "../dsl"
import { journeys } from "../../data/journeys"

// STARTER GLASS COMES BACK THROUGH STARTER WARDS. The starter register is the one panel a player finishes without the
// corridor detector, so none of its glass stands in a hidden path; its spare capacity is visible ward paths in the
// junior, expert and master pyramids, each opened by one of the starter tomb's four keys. A slot's loot tiers by its
// own difficulty, so a path a starter key opens bears starter loot. Two per journey, on its second and last pyramid,
// the keys taken in turn.
const STARTER_TOMB = "starter_treasure_tomb"
const STARTER_KEYS = 4

const hosts = journeys.filter(({ id }) => /^(junior|expert|master)_\d+$/.test(id))

export const starterWardRules: Rule[] = hosts.flatMap(({ id, levelCount }, j) =>
  [2, levelCount].map((pyramid, k) => {
    const key: WardPathSpec = { tomb: STARTER_TOMB, index: (j * 2 + k) % STARTER_KEYS }
    // A master pyramid keeps its own ward path beside the starter one.
    return journey(id).pyramid(pyramid, { wardPaths: id.startsWith("master_") ? ["own", key] : [key] })
  })
)
