import type { DecorationKind } from "@/game/siteTypes"
import { PROP_ROLES, rolesOfProp } from "@/game/dressingTags"
import { hashUnit } from "@/support/hashString"

/**
 * A SECOND piece of furniture in a room, agreeing with the first.
 *
 * `RoomCell.decoration` is one kind, and the assembler's rule is that a room serves ONE PURPOSE — the prop
 * is the room's statement and the wall item follows it (`siteAssembler`, `wallSuiting`). A room with a
 * market table in it says "this is where they sold", and a market says it louder with the baskets beside
 * the table: two objects of the SAME purpose are that rule kept rather than broken. What would break it is
 * two objects of different purposes, and that is exactly what this refuses to place.
 *
 * A SEEDED LAYER ON TOP OF PLACEMENT, not part of it. Nothing here reaches the world: the authored
 * decoration is untouched, no pool changes length, and `pickDressing` never sees a companion — so adding
 * this moves no furniture anywhere and needs no world regeneration. It is the same shape as
 * `floorScatter`, which dresses a chamber's free cells by rule, and for the same reason.
 *
 * Four rules, and each one is a way of not making floors worse:
 *
 * 1. **The leader must have a purpose.** Rubble, a pillar, a chest and a mat are untagged on purpose —
 *    they fit anywhere — so there is nothing for a companion to agree WITH, and a pillar with a
 *    sarcophagus beside it is the "furniture distributed" reading the assembler spent a rewrite escaping.
 *    Untagged leader, no companion.
 * 2. **The companion must share an explicit purpose** with it, and must not be the leader again.
 * 3. **It must be DRAWN at this rank.** A companion is placed by rule, so a kind with only a placeholder
 *    would multiply placeholders across the map — which is the one thing the art backlog must not be able
 *    to do to itself.
 * 4. **The room must be big enough, and most rooms get nothing.** A chamber's floor is around nine cells;
 *    a second prop needs somewhere to stand that is neither the room's icon nor the first prop. And it is
 *    gated to a third of the rooms that qualify, because the failure mode here is not an ugly room, it is
 *    a floor where every room is furnished the same way — measured on the wall items at 19 of 97 floors
 *    when one item filled three quarters of the rooms.
 */

/** How many of the eligible rooms get a companion. A third: enough that a market reads as a market, few
 * enough that a floor still has plain rooms on it. */
const SHARE = 0.34

/** Free cells a room needs before a second prop is welcome — the room's icon cell and the first prop are
 * both already spoken for, so this is what is left over. */
const MIN_FREE = 2

const TAGGED = Object.keys(PROP_ROLES) as DecorationKind[]

/** The kinds that could stand beside `leader` and mean the same thing. Sorted, so the choice cannot
 * depend on key order. */
export const companionsFor = (leader: DecorationKind, hasArt: (kind: DecorationKind) => boolean): DecorationKind[] => {
  const purposes = rolesOfProp(leader)
  if (!purposes?.length) return []
  return TAGGED.filter(
    kind => kind !== leader && hasArt(kind) && rolesOfProp(kind)?.some(role => purposes.includes(role))
  ).sort()
}

/**
 * Where a second prop stands, as `"row,col" -> kind`.
 *
 * `free` is the room's cells with the icon cell and the first prop already removed, in the caller's own
 * order; `pick` chooses among them, so the caller keeps its wall-behind preference.
 */
export const companionFor = (
  siteId: string,
  rooms: readonly { ownerKey: string; leader: DecorationKind; free: readonly string[] }[],
  hasArt: (kind: DecorationKind) => boolean,
  pick: (free: readonly string[]) => string
): ReadonlyMap<string, DecorationKind> => {
  const out = new Map<string, DecorationKind>()
  // Sorted for the reason `scatterFor` sorts: the placement is indexed, and Map order is insertion order,
  // so which room is "first" would otherwise depend on how the claims happened to be built.
  for (const { ownerKey, leader, free } of [...rooms].sort((a, b) => (a.ownerKey < b.ownerKey ? -1 : 1))) {
    if (free.length < MIN_FREE) continue
    if (hashUnit(siteId, `companion-room:${ownerKey}`, 0) > SHARE) continue
    const options = companionsFor(leader, hasArt)
    if (options.length === 0) continue
    const kind = options[Math.floor(hashUnit(siteId, `companion-kind:${ownerKey}`, 1) * options.length)]
    out.set(pick(free), kind)
  }
  return out
}
