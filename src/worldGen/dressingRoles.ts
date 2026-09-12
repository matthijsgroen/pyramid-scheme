import type { DecorationKind, WallDecorationKind } from "../game/siteTypes"
import { PROP_ROLES, WALL_ITEM_ROLES } from "../game/dressingTags"
import type { SiteConfig, SubSection } from "./types"

// A role is the PLACE a stretch of floor is (journeys.md §2: the role is the place, the theme is only
// the hour), so it is also what furnishes it — a trade wing stacks amphorae on shelves, a funerary one
// holds a coffin and a false-door stela. Dressing a journey IS authoring its role, and until now the
// role reached the puzzle families and nothing else: every rank furnished every place identically.
//
// The tag lives on the KIND, not in a pool per (rank × role) — see game/dressingTags.ts, which holds
// the table because the ASSEMBLER needs it too: this file narrows a wing's pool to its role, and the
// assembler then gives one room one purpose out of what survived. A rank stays one authored line, and
// authoring a pool per combination would be 5 ranks × 10 roles of tables to keep.
const rolesOf = (role: string | string[] | undefined): readonly string[] =>
  role === undefined ? [] : Array.isArray(role) ? role : [role]

/** The roles a table actually furnishes. A role outside it — `puzzle` (the default a room with no
 * authored place gets), `trap`, `tomb-puzzle`, or any role a mod invents — narrows nothing: a room that
 * never named a place must keep its rank's whole catalogue, not be cut down to the kinds that belong to
 * no place at all. Narrowing on `puzzle` took the statues, jars and shelves out of most of the world. */
const furnishedRoles = (tags: Partial<Record<string, readonly string[]>>): ReadonlySet<string> =>
  new Set(Object.values(tags).flatMap(roles => roles ?? []))

const PROP_PLACES = furnishedRoles(PROP_ROLES)
const WALL_ITEM_PLACES = furnishedRoles(WALL_ITEM_ROLES)

const narrow = <K extends string>(
  pool: readonly K[] | undefined,
  role: string | string[] | undefined,
  tags: Partial<Record<K, readonly string[]>>,
  places: ReadonlySet<string>
): K[] | undefined => {
  const roles = rolesOf(role).filter(r => places.has(r))
  if (!pool?.length || roles.length === 0) return undefined
  const belongsHere = (kind: K): boolean => !!tags[kind]?.some(r => roles.includes(r))
  const keep = pool.filter(kind => !tags[kind] || belongsHere(kind))
  // **A pool of one is fine when that one thing IS the place.** A scriptorium where every statue is the
  // same Osiris, or a necropolis where every dead end holds a coffin, is a place asserting itself — real
  // tombs repeat, and the repetition is what makes the wing read as one room rather than a sampler. What
  // does read as a bug is a wing left with only the kinds that belong nowhere: every fork holding rubble
  // says the furniture went missing, not that this is the rubble district. So the test is not how MANY
  // kinds survive but whether any of them speaks to this place — and if none does, the narrowing had
  // nothing to say and the rank's own pool stands.
  //
  // The repetition is exact, since a kind resolves to one sprite per rank. If that ever reads as
  // copy-paste rather than as a place, the fix is sprite variants behind the same kind, not padding the
  // pool with furniture the place would not have.
  if (keep.length === pool.length || !keep.some(belongsHere)) return undefined
  return keep
}

const dressNode = (node: {
  role?: string | string[]
  decorations?: DecorationKind[]
  wallDecorations?: WallDecorationKind[]
}): void => {
  const props = narrow(node.decorations, node.role, PROP_ROLES, PROP_PLACES)
  if (props) node.decorations = props
  const wall = narrow(node.wallDecorations, node.role, WALL_ITEM_ROLES, WALL_ITEM_PLACES)
  if (wall) node.wallDecorations = wall
}

/**
 * Narrows every node's dressing pools to what its own role furnishes. Runs after the encounter pass has
 * written each node's `role` and before serialization, so the generated world records the pool a wing
 * will actually draw from rather than the rank's whole catalogue — which is also what makes the
 * dressing readable straight off `generatedWorld.ts`.
 *
 * A node with no role, or one whose narrowing would leave too little to vary, keeps its pool whole.
 * Purely drawn either way: the pools are free fields (docs/game-design/world-spec-stability.md).
 */
export const dressByRole = (allConfigs: Record<string, SiteConfig[]>): void => {
  for (const siteConfigs of Object.values(allConfigs)) {
    for (const floors of siteConfigs) {
      for (const floor of floors) {
        dressNode(floor)
        for (const section of floor.sideSections) {
          dressNode(section)
          for (const sub of (section as SubSection & { sideSections?: SubSection[] }).sideSections ?? []) {
            dressNode(sub)
          }
        }
      }
    }
  }
}
