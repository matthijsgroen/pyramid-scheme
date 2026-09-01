import type { DecorationKind, WallDecorationKind } from "../game/siteTypes"
import type { SiteConfig, SubSection } from "./types"

// A role is the PLACE a stretch of floor is (journeys.md §2: the role is the place, the theme is only
// the hour), so it is also what furnishes it — a trade wing stacks amphorae on shelves, a funerary one
// holds a coffin and a false-door stela. Dressing a journey IS authoring its role, and until now the
// role reached the puzzle families and nothing else: every rank furnished every place identically.
//
// The tag lives on the KIND, not in a pool per (rank × role). A rank stays one authored line — what a
// merchant's tomb is furnished WITH — and the role only decides which of those things this particular
// wing shows. Authoring a pool per combination would be 5 ranks × 10 roles of tables to keep, and the
// second half of them would say the same thing as the first.
//
// **An untagged kind fits anywhere.** Rubble, a pillar, a chest, a mat and a pit belong to no place in
// particular, so they survive every narrowing and are what keeps a pool from collapsing.
const PROP_ROLES: Partial<Record<DecorationKind, readonly string[]>> = {
  shelf: ["trade", "shop", "scribe", "logistics"],
  jarRack: ["trade", "shop", "water", "agriculture", "logistics"],
  offeringTable: ["trade", "funerary", "judgement"],
  basin: ["water", "agriculture"],
  statue: ["funerary", "judgement", "cosmos"],
  sarcophagus: ["funerary"],
  shrine: ["funerary", "cosmos"],
  hanging: ["funerary", "cosmos"],
  lamp: ["light", "scribe"],
  brazier: ["light", "funerary"],
  crystal: ["cosmos", "sky", "light"],
}

const WALL_ITEM_ROLES: Partial<Record<WallDecorationKind, readonly string[]>> = {
  niche: ["trade", "shop", "logistics"],
  tallyBoard: ["trade", "shop", "scribe"],
  stela: ["funerary"],
  veil: ["funerary", "cosmos"],
  wallShrine: ["funerary", "cosmos"],
  starShaft: ["cosmos", "sky"],
  mask: ["funerary", "judgement"],
  // `sconce` carries no tag on purpose: a bracket for a lamp belongs on any wall, and it is what keeps
  // a rank whose other wall items are all funerary from hanging nothing at all in a trade wing.
}

/** How few kinds a narrowed pool may keep. Below it the whole pool comes back: a wing where every fork
 * holds the identical thing reads worse than one that is not dressed for its place at all — which is the
 * same reason the pick is positional rather than a counter. */
const MIN_POOL = 2

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
  const keep = pool.filter(kind => {
    const kindRoles = tags[kind]
    return !kindRoles || kindRoles.some(r => roles.includes(r))
  })
  return keep.length >= MIN_POOL && keep.length < pool.length ? keep : undefined
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
