import type {
  AssembleFloorKeyRequirements,
  EncounterResolution,
  ResolveEncounter,
  ResolveKeyRequirements,
} from "../siteAssembler"
import type {
  AssemblerFailure,
  AssemblerReason,
  DecorationKind,
  FloorGrid,
  Difficulty,
  Direction,
  FloorConfig,
  KeyColor,
  MechanismRecord,
  RoomCell,
  SideSection,
  SubSection,
  WallDecorationKind,
} from "../siteTypes"
import type { MarkAllocation, Mark } from "../mark"
import type { SequenceSigns } from "../sequenceSigns"
import type {
  BarrierRun,
  EdgeGateObstacle,
  FloorCorridor,
  OneWayObstacle,
  RegionGateObstacle,
  SequenceControl,
  StatefulControl,
  WeightsControl,
  ForkSwitchControl,
} from "../obstacles"
import type { ContentKind, RegionAppetite, SideChain } from "../regions"
import type { AbsorbedDemand, LaidFloor } from "../laidFloor"
import type { LockPlan } from "../lockPlan"
import type { CarveFault } from "../carveAgreement"
import type { ResolveBoardIndex } from "../seeds/boardIndex"
import type { ResolveOneWayRealisation } from "../oneWayRealisation"
import type { ResolveRegionBarrierRealisation } from "../regionBarrierRealisation"
import type { ResolvePassageRealisation } from "../passageRealisation"

/** A grid position, row then column. */
export type Cell = [number, number]

/** Where a floor was authored: the journey, which of its levels, which floor of that level. */
export type FloorRef = NonNullable<AssembleFloorKeyRequirements["floorRef"]>

/** A `{ in }` fork resolved against the layout: its seams, and the top-level side sections hosting them. */
export type ForkIn = { region: string; seams: [string, string][]; sectionIdxs: number[] }

/** A side path whose mouth the layout joins by a drop alone, so its seam is the drop's run. */
export type DropSeam = { obstacleId: string; mouth: string; mouthFirst: boolean; realisation: string }

/** A one-way carved between two nodes: its launch, run and landing cells, and what it was bound to. */
export type OneWayEdge = {
  from: string
  to: string
  dir: Direction
  launch: string
  run: string[]
  landing: string
  /** The authored drop this run carries. */
  obstacleId?: string
  /** The id of the realisation the drop was bound to, which names its span and so its prompt. */
  realisation: string
}

/**
 * One carved path hanging off another: what was authored, where the carve put it, and the name it
 * answers to.
 *
 * A path off the main walk and a path off one of those differ only in these fields, so every pass
 * reads a chain rather than a level, and a rule written once holds at both.
 */
export type Chain = {
  section: SideSection | SubSection
  cells: Cell[]
  attachedAt: Cell
  /** Where it sits among its siblings: `s0`, `s0.1`. */
  positional: string
  /** Its own index, and its parent's where it has one — what the section hash is keyed on. */
  idx: number
  parentIdx?: number
  /** The doors that must be earned to stand on it: its own where it is gated or sealed, and every
   * ancestor's. Empty for ground the player reaches unimpeded. */
  doors: string[]
  hidden: boolean
  /** The floor key its gate wants, where it has an unauthored floor-key gate. */
  keyNodeId?: string
  /** The colours of the keys its end room hands out — empty where it hosts none. */
  keyHostColors: KeyColor[]
  /** Ground a lock laid: it has no end room, and its cells answer to the lock's regions, not to a section. */
  laid?: boolean
}

/** One way out of a reserved junction: the node it leads to, and the key the switch's door there asks for. */
export type SwitchWay = { dir: Direction; cell: string; gateKeyId: string }

/** A fork-switch's encounter in its junction, and the gate key each of the junction's exits now names. */
export type ForkSwitchRoom = { room: Partial<RoomSpec>; gateKeyByDir: ReadonlyMap<Direction, string> }

/** A top-level side section hung off the route: the cells it took and the route cell it hangs from. */
export type SectionGroup = { sectionIdx: number; cells: Cell[]; attachedAt: Cell }

/** A room as a pass decides it; the renderer adds what the grid alone knows. */
export type RoomSpec = Omit<RoomCell, "type" | "dirs" | "state" | "sectionHash" | "legacySectionHash" | "hidden">

/** Which section's authored dressing pools a room draws from, on its floor and on its wall. */
export type DressingPools = { props?: DecorationKind[]; wall?: WallDecorationKind[] }

/** A gate the carve agreement checks, with the regions it bounds. */
export type AgreementGate = { id: string; between: readonly [string, string]; key: string; bounds: string[] }

/** A one-way the carve places by matching cells, in either authoring vocabulary. */
export type OneWayDemand = {
  id: string | undefined
  from: string
  to: string
  realisation: string
  /** Named by section address (`config.oneWays`) rather than by region: the two carry different exemptions. */
  sectioned: boolean
}

/** The sub-sections a top-level side section carries, with any grown key host, and which of them hold keys. */
export type SubSectionsOf = { sections: SubSection[]; gatedIdxs: number[]; ungatedIdxs: number[] }

/**
 * EVERYTHING THE CONFIG DECIDES, built once per floor before any attempt: no field holds a seed-derived
 * value, so every attempt reads the same prep and only `CarveState` differs between them.
 */
export type FloorPrep = Readonly<{
  input: Readonly<{
    siteId: string
    floorRef: FloorRef
    /** The told seed where the config carries one, else the address seed. */
    seed: number
    plan: LockPlan | undefined
    answerStubs: boolean
    maxAttempts: number
    onLaid: ((laid: LaidFloor) => void) | undefined
    resolveEncounter: ResolveEncounter
    resolveKeyRequirements: ResolveKeyRequirements
    resolveBoardIndex: ResolveBoardIndex | undefined
    resolveOneWay: ResolveOneWayRealisation
    resolveRegionBarrier: ResolveRegionBarrierRealisation
    resolvePassage: ResolvePassageRealisation
  }>
  config: Readonly<{
    /** The floor with its handles' gates on it. */
    config: FloorConfig
    /** The floor as authored: obstacles, controls and barrier order are read off it. */
    authored: FloorConfig
    /** Each section's name by its positional key (`s0`, `s0.1`). */
    addressOf: ReadonlyMap<string, string>
  }>
  layout: Readonly<{
    regionLayout: FloorConfig["regionLayout"]
    drops: ReadonlyArray<readonly [string, string]>
    route: readonly string[]
    onRouteSet: ReadonlySet<string>
    sideChains: readonly SideChain[]
    chainRegionsBySectionIdx: ReadonlyMap<number, SideChain>
    dropSeams: ReadonlyMap<number, DropSeam>
    layoutCorridors: readonly FloorCorridor[]
    regionDoors: ReadonlyMap<string, ReadonlySet<string>> | undefined
    regionSeamDoors: ReadonlyMap<string, ReadonlySet<string>> | undefined
  }>
  realisation: Readonly<{
    oneWaysUnrealised: boolean
    regionBarriersUnrealised: boolean
    /** The realisation a one-way carries: the registered one, or the name an absent mod left unanswered. */
    oneWay: string | undefined
    regionBarrier: string | undefined
    passageKeys: ReadonlyMap<string, string>
  }>
  mechanisms: Readonly<{
    controlRecords: ReadonlyArray<{ control: StatefulControl; record: MechanismRecord }>
    mainPathControls: ReadonlyArray<{ control: StatefulControl; record: MechanismRecord }>
    offRouteControls: ReadonlyArray<{ control: StatefulControl; record: MechanismRecord }>
    forkSwitches: readonly ForkSwitchControl[]
    sequences: readonly SequenceControl[]
    weights: readonly WeightsControl[]
    leverByAddress: ReadonlyMap<string, MechanismRecord>
    handleGateKeyByAddress: ReadonlyMap<string, string>
    leverAtPositional: ReadonlySet<string>
  }>
  obstacles: Readonly<{
    gateObstacles: readonly EdgeGateObstacle[]
    regionBarriers: readonly RegionGateObstacle[]
    oneWayObstacles: readonly OneWayObstacle[]
    runs: readonly BarrierRun[]
    mainPathRuns: readonly BarrierRun[]
    offRouteRuns: readonly BarrierRun[]
    gateKeys: readonly AgreementGate[]
    landsOnItsStretch: ReadonlyMap<string, string>
    /** Every one-way but those a drop seam already carries; a laid drop's own id is filtered per attempt. */
    oneWayDemands: readonly OneWayDemand[]
  }>
  marks: Readonly<{
    allocation: MarkAllocation
    /** The mark each authored mechanic's gate key wears. A switch's doors are minted per attempt. */
    markByGateKey: ReadonlyMap<string, Mark>
    /** The sequences whose realisation brings its own signs (a procession door), by id: their tiles wear these. */
    sequenceSigns: ReadonlyMap<string, SequenceSigns>
  }>
  families: Readonly<{
    treasureChest: EncounterResolution
    fezShop: EncounterResolution
    keyGate: EncounterResolution
  }>
  forks: Readonly<{
    forkDemands: readonly number[]
    forkIns: readonly ForkIn[]
    forkGroups: ReadonlyArray<readonly number[]>
    junctionGroups: ReadonlyArray<readonly number[]>
  }>
  sections: Readonly<{
    sideSections: readonly SideSection[]
    gatedFloorKeyIdxs: readonly number[]
    ungatedIdxs: readonly number[]
    subSectionsOf: ReadonlyMap<number, SubSectionsOf>
    contentSections: ReadonlySet<number>
    junctionSections: readonly number[]
    absorbedDemands: readonly AbsorbedDemand[]
    appetiteOfRegion: ReadonlyMap<string, RegionAppetite>
    branchSections: readonly number[]
    hubGroupSize: number
    gatedTreasureIdxs: readonly number[]
    gatedStaircaseIdxs: readonly number[]
  }>
  sizing: Readonly<{
    mainPathCells: number
    minCells: number
    lockCells: number
    expectedFootprintRooms: number
    junctionNodes: number
    layPlan: LockPlan | undefined
    contentCount: number
    leverOnMain: boolean
    straightBias: number
    /** The authored wish, where the ladder starts. */
    packing: number
  }>
  hashes: Readonly<{
    mainIsolated: boolean
    mainSectionHash: string
    legacyMainSectionHash: string
  }>
}>

/** How roomy one attempt carves: the grid, the wish, the walk it targets and how far the chains wind. */
export type Rung = {
  n: number
  /** The grid the widening last settled on; a grow adds to `n`, recovery never sizes below it. */
  startingN: number
  packing: number
  targetDistance: number
  chainPacking: number
  /** Past the frozen attempts: the grid is sized to the carve and side paths may carve into their parent. */
  recovery: boolean
}

/** What a cell is labelled with, per cell key. */
export type CellLabels = {
  sectionHash: Map<string, string>
  legacySectionHash: Map<string, string>
  address: Map<string, string>
  ordinal: Map<string, string>
  hidden: Set<string>
  dressing: Map<string, DressingPools>
  difficulty: Map<string, Difficulty>
  region: Map<string, string>
  /** The section hash a filled-in room carries, which is its section's and never the ground's. */
  absorbedHash: Map<string, { hash: string; legacy: string }>
}

/**
 * ONE ATTEMPT'S DECISIONS. Fresh per attempt; each key is written by exactly one pass and read-only
 * after it, and is absent until its pass has run.
 */
export type CarveState = {
  attempt: number
  rung: Rung
  /** The attempt's one stream: every pass that draws, draws from it in pass order. */
  rand: () => number
  /** The grid the lay grew to, written even when the lay refuses: the next rung starts from it. */
  laidN?: number
  /** The lock the floor lays and the route steps its content takes; null where the floor lays none. */
  lay?: { laid: LaidFloor; mainSteps: readonly number[] } | null
  /** The maze around the route, its exit already a dead end. */
  maze?: { n: number; entrance: Cell; exit: Cell; mainPath: Cell[]; passages: ReadonlySet<string> }
  regions?: { stepRegion: ReadonlyArray<string | undefined>; seams: ReadonlySet<number> }
  seamGates?: ReadonlyMap<string, number>
  /** The main path's content before any control moves it. */
  content?: { placed: number[]; goal: number; lever: number; puzzleRole: ReadonlyMap<number, number> }
  junctions?: { steps: ReadonlySet<number>; order: number[] }
  /** The rest of each run, past the gate on the seam. */
  runGates?: ReadonlyMap<string, number>
  mainBarrierDoors?: ReadonlyMap<number, { id: string; region: string; entrance: string }>
  /** Where each main-path control stands, and the puzzles it displaced, in the order it moved them. */
  mainControls?: { at: ReadonlyMap<string, number>; moves: ReadonlyArray<readonly [number, number]> }
  branches?: {
    used: ReadonlySet<string>
    groups: SectionGroup[]
    subChains: Chain[]
    seamDrops: OneWayEdge[]
    carved: ReadonlySet<string>
  }
  keys?: { chains: Chain[]; hostColors: ReadonlyMap<number, KeyColor[]> }
  labels?: CellLabels
  chainGates?: {
    at: ReadonlyMap<string, { idx: number; cellIndex: number }>
    runShort?: { between: [string, string]; barriers: string[] }
  }
  doors?: {
    intended: ReadonlySet<string>
    gated: ReadonlySet<string>
    behind: ReadonlyMap<string, ReadonlySet<string>>
    ground: ReadonlyMap<string, string>
    seamGated: ReadonlySet<string>
    seamBehind: ReadonlyMap<string, ReadonlySet<string>>
  }
  mainRooms?: ReadonlyMap<string, RoomSpec>
  chainRooms?: ReadonlyMap<string, RoomSpec>
  forks?: { reserved: string[]; inFork: ReadonlySet<string>; switchesPlaced: number }
  switchDoors?: ReadonlyMap<string, ReadonlySet<string>>
  /** Each reserved junction's free ways out, in reserve order: the door a switch standing there shuts on each. */
  switchWays?: ReadonlyArray<ReadonlyArray<SwitchWay>>
  /** The encounter standing in each junction a switch fills, by the junction's cell. */
  switchRooms?: ReadonlyMap<string, Partial<RoomSpec>>
  /** The encounter standing in each `{ in }` fork's junction, by the junction's cell. */
  forkSwitchRooms?: ReadonlyMap<string, ForkSwitchRoom>
  /** Every one-way edge, seam drops first. */
  drops?: OneWayEdge[]
  /** The node each pipe's hole stands on, by the hole's id (`pipe@region`); empty on a floor without a pipe. */
  pipeHoles?: ReadonlyMap<string, { cell: string }>
}

type ReasonOf<T extends AssemblerReason["type"]> = Extract<AssemblerReason, { type: T }>

/** What an attempt came up short on, kept by the loop so a floor no attempt carves names why. */
export type Shortfall =
  | ReasonOf<"forksUnsatisfied">
  | { type: "forkSeamsNotLaid"; fork: ForkIn }
  | ReasonOf<"oneWayUnsatisfied">
  | ReasonOf<"regionNotSeated">
  /** `onChain` where an off-route chain left the seam uncarved: that one yields to a short run. */
  | (ReasonOf<"obstacleSeamNotCarved"> & { onChain?: true })
  | ReasonOf<"barriersNotSeated">
  | ReasonOf<"regionBarrierNotSeated">
  | ReasonOf<"controlNotSeated">
  | ReasonOf<"controlPuzzleUndisplaceable">
  | ReasonOf<"sequenceTileNotPlaced">
  | ReasonOf<"plateNotPlaced">
  | ReasonOf<"pipeHoleNotPlaced">
  | { type: "regionWillNotTake"; mismatch: { region: string; kind: ContentKind }[] }
  | { type: "carveDisagreement"; faults: CarveFault[] }
  | ReasonOf<"lockNotLaid">
  | ReasonOf<"contentNotLaid">

/**
 * How a pass fails an attempt: `retry` takes another attempt, noting what came up short (none where the
 * miss says nothing worth naming); `fatal` ends the floor, since no attempt could do better.
 */
export type Refusal = { retry: readonly Shortfall[] } | { fatal: AssemblerFailure["reasons"] }

/** The state a pass sees: what it reads, present and read-only, and what it writes. */
type PassState<R extends keyof CarveState, W extends keyof CarveState> = Readonly<Pick<Required<CarveState>, R>> &
  Pick<CarveState, W>

/** One step of an attempt: decides from prep and what earlier passes wrote, writes its own keys or refuses. */
export type Pass<R extends keyof CarveState, W extends keyof CarveState> = (
  prep: FloorPrep,
  state: PassState<R, W>
) => Refusal | void

/** A pass as the loop runs it, with the keys it reads and writes named so the order can be checked. */
export type PassEntry = {
  name: string
  reads: readonly (keyof CarveState)[]
  writes: readonly (keyof CarveState)[]
  run: (prep: FloorPrep, state: CarveState) => Refusal | void
}

/** Throws when a key `name` reads is still unwritten: a mistake in the pass order, not in a floor. */
export const requireReads = <K extends keyof CarveState>(
  name: string,
  reads: readonly K[],
  state: CarveState
): Readonly<Pick<Required<CarveState>, K>> => {
  for (const key of reads)
    if (state[key] === undefined) throw new Error(`[carve] ${name} reads ${key}, which no earlier pass wrote`)
  return state as Pick<Required<CarveState>, K>
}

/**
 * Declares a pass, and guards its keys as it runs: a key it reads that no earlier pass wrote, a key it writes
 * that an earlier pass already wrote, and a key it leaves unwritten after it did not refuse, are mistakes in
 * the passes, so each throws. A pass with nothing to write says so with an explicit null or no-op value. The
 * keys are taken from the lists alone, so a pass whose own type reads or writes a key its lists leave out does
 * not compile.
 */
export const pass = <R extends keyof CarveState, W extends keyof CarveState>(
  name: string,
  reads: readonly R[],
  writes: readonly W[],
  run: Pass<NoInfer<R>, NoInfer<W>>
): PassEntry => ({
  name,
  reads,
  writes,
  run: (prep, state) => {
    requireReads(name, reads, state)
    for (const key of writes)
      if (state[key] !== undefined) throw new Error(`[carve] ${name} writes ${key}, which an earlier pass wrote`)
    const refusal = run(prep, state as PassState<R, W>)
    if (refusal) return refusal
    for (const key of writes) if (state[key] === undefined) throw new Error(`[carve] ${name} did not write ${key}`)
  },
})

/** What an attempt yields once every pass holds: the grid, or a refusal the grid's own checks raised. */
export type Finish = (prep: FloorPrep, state: CarveState) => Refusal | FloorGrid
