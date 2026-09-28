import type { Mark } from "./mark"
import type { ContentKind, RegionGraph } from "./regions"
import type { Control, Obstacle } from "./obstacles"
export type RoomType = "portal" | "fork" | "encounter"
// OPEN reward vocabulary (docs/mods/distribution-primitive-design.md §D; ARCHITECTURE invariant 1):
// core enumerates no reward/currency id. A reward is a `type` tag plus arbitrary payload fields the
// owning mod defines. Validated at load against per-type zod schemas registered by the mods
// (src/app/SiteMap/rewardSchemas). Producers/consumers that own a type narrow it via its schema
// (mods) or the core-owned shapes below.
export type TreasureReward = { type: string } & Record<string, unknown>

// Core-owned reward shapes — NOT a mod-currency enumeration. `fragmentSlot` is the world-gen
// placement sentinel (never serialized). `mapPiece`/`tombKey` belong to the tomb-treasure mod
// (effect/display/schema/state all live there), but their world-gen PLACEMENT hasn't migrated to
// the solver yet (§E): reachability harvest, validate.ts counting, and the tombKey construction
// literal still cast to these shapes. Kept here as structural cast helpers until §E; the open
// `TreasureReward` stays the surface everything passes around.
export type FragmentSlotReward = { type: "fragmentSlot"; prefers?: string }
export type MapPieceReward = { type: "mapPiece"; tombId: string }
export type TombKeyReward = { type: "tombKey"; keyId: string }

export type Direction = "n" | "s" | "e" | "w"
export type CellState = "fogged" | "visible" | "reachable" | "completed"

export type EmptyCell = { type: "empty" }
export type CorridorCell = {
  type: "corridor"
  dirs: ReadonlySet<Direction>
  state: CellState
  /** The tier this corridor's own section was authored at — what it is BUILT of, which is not always
   * the floor's tier: a ward pocket gated behind a junior key is junior stone inside a starter
   * pyramid. Mirrors RoomCell.difficulty, which has always carried this for rooms. */
  difficulty?: Difficulty
  /** WHICH SECTION OF THE AUTHORING this cell belongs to — `main`, `s0` for the first sidepath off it,
   *  `s0.1` for that sidepath's second sub-path. This is what a save files the cell under, because it
   *  is what the author steers: the first sidepath of the main path stays the first sidepath whether
   *  the builder hangs it after the first encounter or the third, and whether it holds four puzzles or
   *  six. Same addresses `boardIndex.ts` deals boards by. See docs/game-design/world-stability.md. */
  sectionAddress?: string
  /** Which region of the floor's authored layout this cell stands in, where the floor authors one
   * (FloorConfig.regionLayout). A region is a stretch of the carve: the main path crosses several, and
   * a side path belongs to the region it grows from. Absent on a floor that authors no layout. */
  region?: string
  /** Structural fingerprint of the section — how many rooms, how long the walk, what gates it. NOT the
   *  save's identity any more (`sectionAddress` is): it moves when the floor's own carve knobs are
   *  retuned, which is exactly what compacting the corridors does, and that would reset every run in
   *  the world. Kept so the coordinate archive can still be matched while re-keying, and goes with it. */
  sectionHash?: string
  /** The hash this cell had before the section hash stopped covering the encounter, so a save
   *  written under the old scheme still recognises its own cells. Read-only compatibility — nothing
   *  writes it back, and it can go once no live save predates that change. */
  legacySectionHash?: string
  /** How far along its own section's walk this cell sits — its index in path order, or for the
   *  connector between two cells the pair of their indices. A property of the CARVE, not of the
   *  authoring: the walk's length is the carve's choice, so re-carving renumbers it. Not an identity —
   *  what a save names a cell by is its slot (cellIdentity.ts) — but the ORDER survives, which is what
   *  restores the fog as far as the furthest room reached. See docs/game-design/world-stability.md. */
  ordinal?: string
  hidden?: boolean
}
export type GateVariant = "floor-key" | "tomb-key"
export type KeyColor = "blue" | "red" | "green" | "yellow" | "purple"
// Canonical order for anything that LISTS colors (a key ring, a chest's badges) — world-gen assigns
// hues in whatever order a floor's gates came out, and a status readout that reshuffles between
// floors is unreadable.
export const KEY_COLORS: readonly KeyColor[] = ["blue", "red", "green", "yellow", "purple"]
// What stands in a chamber. A kind is a SILHOUETTE and the tier is its skin, resolved as
// tiles/<tier>/<kind>.png — which is what keeps a fifth rank from costing as much to draw as the
// first (docs/game-design/spritesheet-renderer-prep.md, "Chamber props"). `basin` rather than
// "fountain": Egypt had libation basins, ablution basins and temple lakes, not pressurised fountains.
export type DecorationKind =
  | "rubblePile"
  | "pillar"
  | "pit"
  | "statue"
  | "basin"
  | "sarcophagus"
  // A CHEST MEANS TREASURE YOU CAN OPEN, so no rank's pool authors one as furniture. The kind stays
  // because the art does: a treasure room draws `tiles/<tier>/chestProp.png` beside its marker
  // (`NodeChest`). Put it back in a `decorations` pool and the map starts saying "you may open this
  // one and not that one" with the same picture.
  | "chestProp"
  | "offeringTable"
  | "jarRack"
  | "brazier"
  | "lamp"
  | "hanging"
  | "shelf"
  | "shrine"
  | "crystal"
  | "mat"
// What hangs ON a wall, drawn into a cell's face band rather than standing on its floor. Its own
// vocabulary rather than a slice of DecorationKind: a stela is not a prop that could stand in the
// middle of a chamber, and the two must not be confusable
// (docs/game-design/spritesheet-renderer-prep.md, "Three things a tier dresses"). Resolved as
// tiles/<tier>/<kind>.png at CELL x WALL_H — the band's own shape, not a square.
export type WallDecorationKind =
  "niche" | "stela" | "sconce" | "veil" | "starShaft" | "wallShrine" | "tallyBoard" | "mask"

/**
 * Something that has got INTO a site and runs through the whole of it — water standing in the floors,
 * green forcing its way through the brick.
 *
 * A third axis beside role and theme, and it has to be its own: journeys.md §2 fixes the role as the
 * PLACE and the theme as the HOUR, and a flooded pyramid is neither. It is the same place at the same
 * hour with something wrong with it, and unlike either of those it is a property of the SITE — the point
 * is that it persists as the player climbs from a merchant's cellar to the gods' vault.
 *
 * Drawn as OVERLAY, never as a second set of tiles per rank: `moodSettings.ts` composes it over the
 * rank's own ambience the same way an hour does, and one shared sprite serves every rank the way
 * `scarab.png` already does. Doubling the sheet count to say a tomb is overgrown would buy the player
 * nothing that a green cast and some weeds in the corners does not.
 */
export type ConditionKind = "overgrown" | "flooded"

/** How far gone a site is, 0–1. The DSL's other knobs are all fractions, so this is one too: 0.25 is a
 * damp corner, 1 is the pyramid the journey is remembered for. */
export type SiteCondition = { kind: ConditionKind; amount: number }

/**
 * Whose tomb this is dedicated to, if anyone.
 *
 * A closed union rather than an open string, unlike `theme` or `role`: a patron does nothing but choose a
 * DRAWING, so an unrecognised one would fail silently as a tile that never resolves — where a misspelt
 * theme at least reaches a family that can complain.
 *
 * NINE, not the seven the handover proposed. The design's list was written without checking the world
 * against it, and the world disagrees in both directions: six journeys are NAMED for a god, and two of
 * those — Thoth's temple and the Hall of Osiris — were missing from the seven, while Horus, Sobek and
 * Sekhmet are on the list and named by no journey at all. Both were already in the art brief's statue row
 * ("Thoth ibis-headed with palette", "gilded Osiris colossus"), so the list was the thing that was short.
 *
 * PURELY DRAWN, and free to author (docs/game-design/world-spec-stability.md). It picks
 * `<kind>-<patron>.png` over `<kind>.png` for the five kinds a god can appear on, and falls back to the
 * generic art wherever that file does not exist — which is everywhere today. Nothing else reads it: not
 * the carve, not the hashes, not a family.
 */
export const PATRONS = ["anubis", "horus", "sobek", "bastet", "maat", "ra", "sekhmet", "thoth", "osiris"] as const
export type Patron = (typeof PATRONS)[number]
export type RoomCell = {
  type: "room"
  roomType: RoomType
  dirs: ReadonlySet<Direction>
  state: CellState
  /** WHICH SECTION OF THE AUTHORING this cell belongs to — `main`, `s0` for the first sidepath off it,
   *  `s0.1` for that sidepath's second sub-path. This is what a save files the cell under, because it
   *  is what the author steers: the first sidepath of the main path stays the first sidepath whether
   *  the builder hangs it after the first encounter or the third, and whether it holds four puzzles or
   *  six. Same addresses `boardIndex.ts` deals boards by. See docs/game-design/world-stability.md. */
  sectionAddress?: string
  /** Which region of the floor's authored layout this cell stands in, where the floor authors one
   * (FloorConfig.regionLayout). A region is a stretch of the carve: the main path crosses several, and
   * a side path belongs to the region it grows from. Absent on a floor that authors no layout. */
  region?: string
  /** See CorridorCell.sectionHash — structural, and no longer the save's identity. */
  sectionHash?: string
  /** See CorridorCell.legacySectionHash. */
  legacySectionHash?: string
  /** How far along its own section's walk this cell sits — its index in path order, or for the
   *  connector between two cells the pair of their indices. A property of the CARVE, not of the
   *  authoring: the walk's length is the carve's choice, so re-carving renumbers it. Not an identity —
   *  what a save names a cell by is its slot (cellIdentity.ts) — but the ORDER survives, which is what
   *  restores the fog as far as the furthest room reached. See docs/game-design/world-stability.md. */
  ordinal?: string
  hidden?: boolean
  reward?: TreasureReward
  /** A shop node's stock: up to `rewardCapacity` reward slots (currency pieces + consumables) the
   * mods placed into the section's `rewards[]`. The shop family renders these as its buyable list;
   * each is priced by the shop and claimed per (node, index). Entries may be undefined (unfilled). */
  stock?: (TreasureReward | undefined)[]
  requiredKeyId?: string
  // Same precondition as requiredKeyId, generalized to several — every id must be owned
  // for this room to be completable. A tableau needing several hieroglyphs complete is
  // several independent locks, not one; resolved per-room at assembly time by whichever
  // family owns it (see ResolveKeyRequirements in siteAssembler.ts) — core never
  // interprets what an id means.
  requiredKeyIds?: string[]
  gateVariant?: GateVariant
  /** True when requiredKeyId is an authored id (SubSection["gate"].keyId), not one the assembler's
   * own key-host chain assigned — the key comes from elsewhere, so validateSite expects no on-floor
   * tombKey for it. Written down rather than inferred, same reasoning as RoomCell.patronRoom. */
  keyIsAuthored?: boolean
  keyColor?: KeyColor
  keyColors?: KeyColor[]
  // This room's position among its own section's puzzle rooms (0-based, path order) —
  // purely structural, meaningful only to whichever family reads it (e.g. the tableau
  // family re-deriving which TableauLevel it presents from journeyId + the section's own
  // encounterArgs.runNr + this index, not from floor position).
  pathIndex?: number
  // Which entry of its family's seed list this room draws (see src/game/seeds/boardIndex.ts). Every
  // room drawing from one list gets a different entry, so no two rooms in the world serve the same
  // board. Unset where the site isn't part of the baked world (stories, specs, the builder), and the
  // room falls back to indexing the list by its own hash.
  boardIndex?: number
  // The authored encounter args for this room's family (e.g. a tableau's `{ runNr }`), carried
  // from the FloorConfig/SideSection so the play-time family can re-derive exactly what world-gen
  // resolved (which authored TableauLevel this is). Opaque to core; each family reads it via its
  // own zod schema. Mirrors FloorConfig/SideSection.encounterArgs.
  encounterArgs?: unknown
  // The role this room was allocated for — "trade", "sky", "puzzle". What the AUTHOR asked for, where
  // `family` is what that request resolved to, and a family reads it to know which of its identities this
  // room is (the same board is a star map for `sky` and a haul-road network for `trade`).
  role?: string | string[]
  // The tier this room's puzzle generates at, carried from the FloorConfig/SubSection that authored
  // it — a section may sit at a different difficulty than its floor (a ward pocket, a deliberately
  // gentler detour), and the room is what the player meets, not the floor. Unset falls back to the
  // floor's own difficulty.
  difficulty?: Difficulty
  // Which skin this room's family should wear (docs/instructions/puzzle-screens.md §2), carried from the
  // FloorConfig/SideSection that authored it. A NAME, not a look: core knows nothing about what it means,
  // and a family with no skin registered under it draws its default one.
  theme?: string
  // Registered family id (src/app/families/familyRegistry.ts) — open string, not a closed
  // union, since mods register their own families. Always set for roomType "encounter".
  family?: string
  // The resolved family's own tags (e.g. ["trap"], ["treasure"]) — lets domain-layer code
  // (siteValidator.ts, SiteMapView.tsx) classify a room without knowing family ids itself.
  tags?: string[]
  stairId?: string
  decoration?: DecorationKind
  wallDecoration?: WallDecorationKind
  /**
   * THE GOD'S ROOM on a dedicated floor: the biggest chamber, dressed with a statue of him and paired.
   *
   * It used to be inferred — prop AND wall item both being patron kinds — which needed no field and
   * worked at every rank that hangs something a god can appear on. The merchant hangs a goods niche and
   * a tally board, so at his rank the inference can never be true, and the Temple of Bastet's main hall
   * stood a statue beside a sarcophagus instead of beside a second statue. A room the assembler CHOSE is
   * a fact about that room, not something to re-derive from what it happens to be wearing.
   */
  patronRoom?: boolean
  /** A fork room's own ways out, each with what lies down it: `main` continues the main path,
   * `side` reaches an attached section, `ward` is a side gated by a tomb-key, and `fork` leads
   * straight to another fork room. Read off the neighbour node two grid cells away (NODE_STEP in
   * siteAssembler.ts) in each of the cell's own `dirs`. Unset off fork rooms — nothing needs it yet.
   *
   * `gateKeyId` is set on the ways out a SWITCH closed, and is how the builder reports which ones it
   * chose: whatever stands in the switch reads them off the room it is in rather than guessing the
   * floor's shape. It NAMES the way out and is not a key anything holds — the board in the fork opens
   * one of these ids at a time, and no chest anywhere mints them. */
  exits?: { dir: Direction; kind: "main" | "side" | "ward" | "fork"; gateKeyId?: string }[]
  /** THIS ROOM IS A MECHANISM: which gate key id each of its positions opens, and which position it
   * stands in until someone moves it.
   *
   * One record for every mechanism the floor has, so the walk (src/game/floorLock.ts) and the runtime
   * (src/game/mechanismDoors.ts) read the same list rather than each deriving one. A switch also
   * reports its doors on `exits[].gateKeyId`: that is what its own board reads to know what to draw,
   * and it is the account the walk matches a switch's doors by, so a key id colliding with another
   * door's elsewhere on the floor cannot hand a board a door that is not its own. A lever, standing
   * sections away from what it drives, names no direction and is matched by the key the room asks for.
   *
   * A lever is a toggle: two positions, each opening a set of gates and shutting the other's, thrown
   * back and forth for ever. A board has one position more than it has ways out — rest, which opens
   * none — and it too is worked back and forth: the player walks back into a solved switch, turns a
   * mirror off every shrine and leaves it lighting nothing. The walk (src/game/floorLock.ts) gives
   * each the moves it really has by reading them off this record, never by assuming a shape for a
   * kind — which hands the walk a move the player does not have, or takes one they do. */
  mechanism?: MechanismRecord
  /** WHICH MECHANISM THIS ROOM BELONGS TO, said in a glyph on a coloured ground (src/app/SiteMap/mark.tsx).
   * A mechanism's room and every gate it owns carry the same pair, and that pairing is the only thing
   * on the floor that says which lever drives which door. Unset everywhere else. */
  mark?: Mark
}
export type GridCell = EmptyCell | CorridorCell | RoomCell

export type FloorGrid = {
  readonly cells: ReadonlyArray<ReadonlyArray<GridCell>>
  /** The floor's own tier, straight off its FloorConfig — what the map is built OF. Room-level
   * `RoomCell.difficulty` can differ (a ward-chest teaser is authored at a later tier), so it must not
   * be used to infer this. Optional only because test fixtures build grids by hand. */
  readonly difficulty?: Difficulty
  /** What has got into this site, if anything — see SiteCondition. Runs through every floor of a
   * pyramid by construction: it is authored once, on the pyramid. */
  readonly condition?: SiteCondition
  /** Whose tomb this is — see Patron. Authored once on the pyramid like `condition`, so every floor of
   * the climb is dedicated to the same god. Chooses a drawing and nothing else. */
  readonly patron?: Patron
  /** The hour this floor is at — its authored `theme` (docs/game-design/journeys.md §2: the role is the
   * place, the theme is the hour). The map reads it for its mood overlay and nothing else; a family reads
   * the same name off its own room to pick a skin. Optional: most floors author none and wear their
   * rank's own ambience. */
  readonly theme?: string
  readonly rows: number
  readonly cols: number
  readonly entrancePos: readonly [number, number]
  readonly exitPos: readonly [number, number]
  readonly siteId: string
  readonly staircases: Record<string, readonly [number, number]>
}

/** THE TWO SIDES A LEVER HANGS ON, and the whole of its state vocabulary. The assembler tags each
 * gate with one, the record declares exactly these, the save stores one of them, and the lever's
 * screen draws one button per side and asks the locale files for its name — all of which have to
 * agree letter for letter, so they read the same list. */
export const HANDLE_SIDES = ["left", "right"] as const
export type HandleSide = (typeof HANDLE_SIDES)[number]

/** The position a beam board sits in when it opens nothing: no shrine lit, so every way out of its
 * fork stands shut. One name for it, in the save and in the compiled lock alike — a board turned back
 * off every shrine and a board never touched are the same POSITION and a different FACT, which is why
 * one is stored and the other is absent.
 *
 * A board's position only. A lever has the two sides it hangs on and nothing between them
 * (HANDLE_SIDES), and the side the author starts it on is a position like any other, so no lever ever
 * stores this.
 *
 * Plain data written onto cells by the assembler, so it lives in the domain rather than beside the
 * save that stores it (src/app/state/useJourneys.ts re-exports it for app callers): the domain layer
 * holds no React, and `yarn generate-world` is a node CLI that reaches this file. Same reasoning as
 * `Mark` in src/game/mark.ts. */
export const MECHANISM_AT_REST = "rest"

/**
 * A MECHANISM'S WHOLE STATE MACHINE, said once on the cell it stands in: the positions it has, the one
 * it starts in, whether it can be put back there, and which gate each position opens.
 *
 * The walk (src/game/floorLock.ts) and the runtime (src/game/mechanismDoors.ts) both read THIS rather
 * than each deriving a shape from what kind of thing they think is standing there. Which moves a
 * mechanism offers is a fact about the mechanism, not about its family: assuming a shape for a kind
 * hands the walk a move the player does not have, or takes one they do.
 */
export type MechanismRecord = {
  /** Every position this mechanism has, including ones that open nothing. Declared rather than derived
   * from `positions`: a lever hangs left or right whether or not either side names a gate, so a walk
   * that read the vocabulary off the gates would not know the door could be shut again. */
  states: string[]
  /** The position it stands in before anyone touches it. A save holding no entry for it means THIS
   * state, not "nothing open" — which is what lets one side of a toggle stand open on arrival without
   * the carve having to place an already-open gate. One of `states`. */
  initial: string
  /** Whether `initial` is a position the player can put it back into. True of a lever, whose two sides
   * are thrown back and forth for ever, and true of a beam board as well: walking back into a solved
   * switch and turning a mirror off every shrine leaves it lighting nothing, which is where it began.
   *
   * Declared rather than assumed from what kind of thing is standing there. A mechanism that could not
   * be put back would hand the walk a move the player has not got, and the day one is authored this is
   * where it says so. */
  returnsToInitial: boolean
  /** One entry per gate this mechanism drives, tagged with the position that opens it. Several entries
   * may share a position — a lever thrown left opens every gate its left side names — and a position
   * that opens nothing simply has none. */
  positions: { state: string; gateKeyId: string }[]
}
export type GateConfig =
  | {
      type: "floor-key"
      color?: KeyColor
      /** The key this gate wants, authored explicitly instead of drawn from the floor's key-color
       * rotation — the assembler grows no host chest for it. Mirrors worldGen/types.ts's
       * SubSection["gate"].keyId. */
      keyId?: string
      /** Which mod mints that key; unread here. Mirrors worldGen/types.ts's SubSection["gate"].ownerMod. */
      ownerMod?: string
    }
  | { type: "tomb-key"; wardKeyId: string }
export type { Difficulty } from "@/data/difficultyLevels"
import type { Difficulty } from "@/data/difficultyLevels"
export type SubSection = {
  /** The authored name for this path, if it has one — what a save files its cells under, in place of
   * the positional `s0`/`s0.1`. See SideSectionConstraint.label and cellIdentity.ts. */
  label?: string
  pathPuzzles: number
  difficulty: Difficulty
  end: "treasure" | "staircase" | { stairId: string }
  gate?: GateConfig
  endReward?: TreasureReward
  rewards?: (TreasureReward | undefined)[]
  hidden?: boolean
  /** Isolates this section's cells from leftover maze edges, so a compact layout can't merge a shortcut around it. */
  sealed?: boolean
  /** Family/tag(s) for this section's own intermediate rooms — defaults to the "puzzle" tag
   * (sumplete) when unset (a floor's tableau family never leaks onto a side path unless a
   * section explicitly opts in). Never "crocodile" — that's a main-path-finale-only family.
   * An array means "any of these": the union of those tags' pools. Narrowing is a narrower tag's job. */
  encounter?: string | string[]
  /** Per-node encounter override: 0-based room index → family/tag, resolved from authored `nodes`
   * selectors (docs/mods/ARCHITECTURE.md ("Authoring: node selectors")). Room k uses `encountersByIndex[k] ?? encounter`;
   * at runtime the values are resolved family ids. */
  encountersByIndex?: Record<number, string | string[]>
  /** Pool of decoration kinds available to this section's fork/endpoint rooms. */
  decorations?: DecorationKind[]
  /** Pool of wall-item kinds for the same rooms, hung on a wall instead of standing on the floor. */
  wallDecorations?: WallDecorationKind[]
  /** Opaque payload for whichever family renders this section's rooms (e.g. a tableau's
   * `{runNr}`) — validated by that family's own ResolveKeyRequirements resolver, never
   * interpreted here. See ResolveKeyRequirements in siteAssembler.ts. */
  encounterArgs?: unknown
  /** Skin name for this section's puzzle rooms — inherited from the site where the section authors none. */
  theme?: string
  /** The role these rooms were allocated for ("trade", "sky", "puzzle"…), kept alongside the family it
   * resolved to so a family can dress for the pool it was drawn from. */
  role?: string | string[]
}
export type SideSection = SubSection & {
  sideSections?: SubSection[]
}
export type FloorConfig = {
  pathPuzzles: number
  difficulty: Difficulty
  end: "treasure"
  exitOrStaircase: "exit" | "staircase" | { stairId: string }
  /** If set, the entrance room becomes an up-stairhead with this stairId. */
  entrance?: "stairhead" | { stairId: string }
  sideSections: SideSection[]
  /** Pool of decoration kinds available to the main path's fork/endpoint rooms. */
  decorations?: DecorationKind[]
  /** Pool of wall-item kinds for the same rooms, hung on a wall instead of standing on the floor. */
  wallDecorations?: WallDecorationKind[]
  /** What has got into this site — see SiteCondition. Authored once on the pyramid, so every floor
   * carries the same one and it runs through the whole climb. */
  condition?: SiteCondition
  /** Whose tomb this is — see Patron. Authored once on the pyramid and copied onto every floor of it. */
  patron?: Patron
  mainEndReward?: TreasureReward
  rewards?: (TreasureReward | undefined)[]
  /** Default family/tag(s) for this floor's main-path encounter rooms. An array means "any of these". */
  encounter?: string | string[]
  /** WHAT THE CARVE MUST PROVIDE: `count` junctions, each with at least `exits` ways out free to be
   * closed. A junction's free ways out are the main path ONWARD and the side paths hanging off it —
   * never the way back (which would shut the player in with the junction), never one a ward door or
   * another room already stands in, and never one into a hidden section. A carve offering fewer is
   * re-carved, and a floor no carve can satisfy fails rather than losing the junction quietly.
   *
   * Structural, and it decides the floor's shape on its own: the same `forks` carves the same floor
   * whether or not anything is ever stood in those junctions. */
  forks?: { exits: number; count: number }[]
  /** WHAT THE CARVE MUST PROVIDE: a passage from one named section to another that the player may
   * take only in that direction. Both ends name a section address — a `label` where a section has
   * one, the positional `s0`/`s1.2` where it does not, and `main` for the main path.
   *
   * Structural, like `forks`: the two sections have to come out of the carve with node cells two
   * apart, so an attempt that cannot place one is re-carved and a floor no attempt can satisfy fails
   * rather than losing the passage quietly. Where a drop lands is a design decision, which is why it
   * is authored rather than found — see docs/mods/floor-topology-design.md.
   *
   * Named ends, unlike `forks`' counts: a floor whose side sections a rule strips or never grows has
   * no address for either end to resolve to, and the drop is then refused outright rather than landing
   * somewhere else. Author `oneWays` on a floor whose sections you also author. */
  oneWays?: { from: string; to: string }[]
  /** A LEVER STANDING IN ONE SECTION THAT OPENS A GATE ON OTHERS. `in` names the section the lever
   * stands in; `left` and `right` name the sections whose entrance gates each side of it owns. All
   * are section addresses — a `label` where a section has one, the positional `s0`/`s1.2` where it
   * does not, and `main` for the main path — the same vocabulary `oneWays` names its two ends with.
   *
   * Unlike `switches`, which stands an encounter in a junction and closes THAT junction's own ways out,
   * a handle reaches across the floor. That is the whole of what it buys, and it is what a fork cannot
   * express: the catalogue's "a lever elsewhere opens a door here".
   *
   * Each driven section gets a gate keyed `handle:<journeyId>#<levelIndex>#<floorIndex>#<n>:<address>`,
   * derived from where the floor was AUTHORED — neither end of which a re-carve can move, so a position
   * kept from an earlier layout cannot come to fit a door it was never thrown for.
   *
   * A lever has two positions and nothing between them: thrown to a side, it opens every section that
   * side names and shuts every section the other side names. It starts on `starts` (left unless the
   * author says otherwise), so those gates stand open the moment the player arrives.
   *
   * A driven section may not be the main path (which has no entrance to gate), may not be the one the
   * lever stands in (which would shut the lever in behind its own door), may not already carry an
   * authored gate, may not be driven by a second handle, and may not stand on both sides of one lever
   * (a door it could neither open nor close) — each is refused by name before a wall is carved. */
  handles?: { in: string; left: string[]; right: string[]; starts?: HandleSide }[]
  /**
   * THE FLOOR'S AUTHORED REGION LAYOUT: named regions, what joins them, and the two ports it is
   * entered and left through (docs/game-design/regions-and-containers.md). Not to be confused with
   * `AssemblerReason`'s `layoutNotFound`, which means the carve found no MAZE layout at this seed —
   * an unrelated, later-stage failure that shares no field with this one.
   *
   * A region declares only an APPETITE — what it will take — and never what fills it. Typed as
   * `RegionGraph` rather than restated here, so the shape has one definition and the vocabulary can
   * grow in one place.
   */
  regionLayout?: RegionGraph
  /** WHAT STANDS BETWEEN THE FLOOR'S REGIONS, and what decides whether it does — the topology mod's,
   * pointing at core's `regionLayout` by region name (src/game/obstacles.ts). An obstacle is named
   * once here and referred to by id; a control names which obstacles each of its states opens. Both
   * drop when the mod is not registered, and the identical walls then carve with every connection
   * open. */
  obstacles?: Obstacle[]
  controls?: Control[]
  /** A SWITCH: an encounter standing in one of the junctions `forks` reserved, closing that
   * junction's free ways out so that what the player meets there decides which one opens.
   * Family/tag(s) like `encounter`. At least `min` and at most `max` of the reserved junctions get
   * one, and a `min` beyond what `forks` reserves fails the floor.
   *
   * The author names what stands there and nothing else — not which junction (where they fall is the
   * carve's choice), not which ways out (the builder closes every free one and reports them back on
   * the room's own `exits`, RoomCell.exits.gateKeyId), and not the key ids. Each gate wants
   * `switch:<journeyId>#<levelIndex>#<floorIndex>#<n>:<sectionAddress>` — derived from where the
   * floor was AUTHORED and which section that way out reaches, neither of which a re-carve can move,
   * so a key kept from an earlier layout cannot come to fit a door it was never solved for.
   *
   * Opaque to core: the ids name no mod and nothing here mints them; whatever fills the switch does,
   * reading them off the room's own `exits`. */
  switches?: { encounter: string | string[]; min: number; max: number }
  /** Per-node encounter override for the main path: 0-based room index → family/tag, resolved from
   * authored `nodes` selectors (e.g. the last room → "capstone"/crocodile). Room k uses
   * `encountersByIndex[k] ?? encounter`; baked to concrete family ids by the gen-time encounter
   * pass. Replaces the old last-only `lastMainPuzzleFamily`. See docs/mods/ARCHITECTURE.md ("Authoring: node selectors"). */
  encountersByIndex?: Record<number, string | string[]>
  /** How often the maze continues straight instead of turning, 0-1. Defaults to 0.65 (fairly straight); lower = more winding. */
  corridorStraightness?: number
  /** Main-path length multiplier, relative to actual content. Defaults to 1; lower = a shorter, tighter walk, higher = a longer, more wandering one. */
  packing?: number
  /** Isolates the main path's cells from leftover maze edges, so a compact layout can't merge a shortcut around a puzzle room. */
  sealed?: boolean
  /** Opaque payload for whichever family renders the main path's rooms (e.g. a tableau's
   * `{runNr}`) — validated by that family's own ResolveKeyRequirements resolver, never
   * interpreted here. See ResolveKeyRequirements in siteAssembler.ts. */
  encounterArgs?: unknown
  /** Skin name for this floor's puzzle rooms. Unset inherits the site's; a floor may override it. */
  theme?: string
  /** The role this floor's main-path rooms were allocated for, kept alongside the resolved family. */
  role?: string | string[]
}

// A site is one or more floors. Index 0 = surface.
export type SiteConfig = FloorConfig[]

export type ValidationReason =
  | { type: "keyAfterGate"; gatePos: readonly [number, number]; keyPos: readonly [number, number] }
  | { type: "allBlandFork"; forkPos: readonly [number, number] }
  | { type: "mapPieceNotSealReachable"; pos: readonly [number, number] }
  | { type: "mapPieceMissing" }
  | { type: "mapPieceDuplicate"; siteIds: string[] }
  | { type: "mosaicMissing" }
  | { type: "mosaicNotReachable" }
  | { type: "mosaicDuplicate"; siteId: string }
  /** Two different openers stand in one room-to-corridor boundary — a gate room's own key and a fork's
   * exit closed toward it, or two forks closing the same way out. A player meeting it cannot tell which
   * door they are looking at, nor which of the two they have just satisfied. */
  | { type: "boundaryGatedTwice"; pos: readonly [number, number]; keyIds: string[] }
  /** A gate a switch closed can be walked up to without passing through the switch, so the blocker is
   * met before its opener. At a fork the opener is the room the player stands in, so this holds by
   * construction; the check is what keeps it true when something else moves. */
  | { type: "switchGateNotBehindSwitch"; switchPos: readonly [number, number]; gatePos: readonly [number, number] }

export type ValidationResult = { valid: true } | { valid: false; reasons: ValidationReason[] }
export type AssemblerReason =
  | ValidationReason
  | { type: "noUngatedSectionForKey" }
  | { type: "layoutNotFound" }
  /** A section cannot be given a name a save could file it under: an authored `label` repeated, one
   * shaped like the positional addresses, or one carrying an address separator. See SubSection.label. */
  | { type: "unusableSectionAddress"; address: string }
  /** A section hangs below the two levels of side path the assembler carves, so it would be authored
   * and baked but never built — the DSL nests without limit, the carve does not. `address` is the name
   * the section answers to. See SideSection.sideSections. */
  | { type: "sectionTooDeep"; address: string }
  /** Two rooms of one section answer to the same name, so a save cannot tell them apart — a switch
   * authored with the family that already fills its section's chest, shop or gate. See cellSlot.ts. */
  | { type: "duplicateCellSlot"; slot: string }
  /** No carve offered as many junctions with `exits` ways out free to close as `forks` asked for —
   * `carved` is the most any attempt managed. See FloorConfig.forks. */
  | { type: "forksUnsatisfied"; exits: number; count: number; carved: number }
  /** More switches are asked for than the floor's `forks` reserve junctions to hold them, which no
   * carve can settle. See FloorConfig.switches. */
  | { type: "switchesExceedForks"; min: number; forks: number }
  /** A switch was authored with a family whose room closes behind the player. Its gates open one way
   * out and leave the others shut, and keys accumulate, so the cost of the choice is a walk back to
   * spend it again — which a room that cannot be re-entered never offers. See FamilyMeta.reEnterable. */
  | { type: "switchFamilyNotReEnterable"; family: string }
  /** An authored one-way (FloorConfig.oneWays) never got its passage: `from` names a section this
   * floor does not have, or every attempt ran out before it found the two sections a node apart with
   * an empty cell between them. */
  | { type: "oneWayUnsatisfied"; from: string; to: string }
  /** An authored handle (FloorConfig.handles) names a section it cannot have, and `address` is the
   * name that failed: `in` or a `left`/`right` entry naming no section of this floor, a driven
   * section that is the main path, the one the lever stands in, one already carrying a gate, or one a
   * second handle drives too. Which sections exist and what each already carries is fixed by the config, so this is
   * answered once rather than blamed on carves that could never have satisfied it. */
  | { type: "handleUnsatisfied"; handle: number; address: string }
  /** Two regions of one layout answer to the same name, so nothing could tell which one a connection,
   * a port or a piece of content meant. See FloorConfig.regionLayout. */
  | { type: "regionNameRepeated"; name: string }
  /** A connection names a region the layout never declares. It would carry the route without ever
   * being a place, so a region the walk must pass through could read as neither main path nor
   * stranded. See FloorConfig.regionLayout. */
  | { type: "connectionNamesNoRegion"; name: string }
  /** A layout's port names a region it does not have, so the floor has no way in or no way out. */
  | { type: "portNamesNoRegion"; port: "in" | "out"; name: string }
  /** A region no walk from the way in arrives at. Once regions carry content, that is loot a player
   * can never collect (docs/game-design/regions-and-containers.md). */
  | { type: "regionUnreachable"; name: string }
  /** A room stands in a region whose appetite does not take what it holds — a puzzle where the layout
   * promised nothing, a reward where it asked for puzzles. The floor's content and its layout disagree,
   * and which is wrong is the author's to say. See FloorConfig.regionLayout. */
  | { type: "regionWillNotTake"; region: string; kind: ContentKind }
  /** An authored obstacle or control does not resolve against the floor's region layout — the id that
   * failed is named, because the author needs to know which one. See src/game/obstacles.ts's
   * TopologyFault, whose members these are. */
  | { type: "obstacleIdRepeated"; id: string }
  | { type: "obstacleNamesNoConnection"; id: string }
  | { type: "obstacleOffRoute"; id: string }
  | { type: "obstacleUnowned"; id: string }
  | { type: "controlUnsatisfied"; id: string; what: string }
  /** A declared region that never got a cell, for either of two reasons: the route the main path
   * threads has more regions than the path has steps, so the regions at its far end are never reached;
   * or a region is reachable in the region graph but never lies on the shortest in→out walk at all, so
   * no step ever names it. Either way content that would have gone there lands in a region the author
   * did not name. `regions` are every one left unseated, in route order. See FloorConfig.regionLayout.
   * Unlike its five neighbours above, this reason carries a LIST rather than one name: those are each
   * an independent fault where fixing the one name removes it, whereas an unseated set is a single
   * fault whose extent happens to be a list — fixing one name here fixes nothing, so do not normalise
   * this to a single-name shape. */
  | { type: "regionNotSeated"; regions: string[] }
export type AssemblerFailure = { success: false; reasons: AssemblerReason[] }
export type AssemblerResult = { success: true; grid: FloorGrid } | AssemblerFailure

// ── Detector types ────────────────────────────────────────────────────────────

export type DetectorMode = "compass" | "consumable" | "hiddenPassageway" | null

// `cell` (row,col within the floor) is resolved only at compass level 3 — it needs a floor
// assembly the lower levels don't pay for. See collection-and-detector-design.md §7.2.
export type CompassResult = {
  journeyId: string
  levelIdx: number
  floorIdx: number
  hieroglyphId: string
  pieceIndex: number
  cell?: { row: number; col: number }
  // Access facts a scanner observes while walking the config, for the readout to flag pieces you
  // can't collect yet (§7.2's readout is otherwise happy to point at gated content). Deliberately
  // raw facts, not a verdict: the scanner has no access to what the player holds, so judging
  // reachability is the consumer's job (useDetector).
  //
  // Every tomb-key ward gate between the floor and this piece — ALL must be held to reach it.
  wardKeys?: readonly string[]
  // The piece sits in a hidden corridor: structurally reachable but discovery-gated (§7.3), so it
  // needs the corridor detector or luck rather than a key.
  hidden?: boolean
  // The piece is stock in a shop, so it costs money on top of getting there — a blocker the
  // readout can't evaluate, hence surfaced as uncertainty rather than a lock.
  inShop?: boolean
}

// Whether the player can actually go and collect a compass hit right now. The readout only models
// some of what can block a piece, so this deliberately has a "don't know" value rather than
// collapsing unknowns into "fine":
// - "locked"  a checkable blocker IS in the way (a ward key not held, or the tier not unlocked)
// - "hidden"  in a hidden corridor: needs the corridor detector or luck, not a key (§7.3)
// - "unknown" a blocker exists that this readout can't evaluate (tomb map-piece entry, shop price)
// - "open"    nothing known is in the way — NOT a guarantee, just "we checked and found nothing"
export type CompassAccess = "open" | "locked" | "hidden" | "unknown"

// A compass hit with its access verdict resolved against what the player currently holds.
export type CompassHit = CompassResult & { access: CompassAccess; missingKeys?: readonly string[] }

// A chest whose consumable was left behind, so the supplies detector can narrow its readout by level
// (§7.2): L1 pyramid, L2 +floor, L3 +cell. `floorIdx` reads straight off the address; `cell` needs an
// assembled floor to say where that address landed, so it is only there for the floor on screen.
export type ConsumableResult = {
  journeyId: string
  address: string
  floorIdx: number
  cell?: { row: number; col: number }
}
