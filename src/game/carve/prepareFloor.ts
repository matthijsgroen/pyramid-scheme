import { DEFAULT_PACKING } from "../carveConstants"
import { hashString } from "@/support/hashString"
import { allocateMarks, type Mark, type MarkRequest } from "../mark"
import {
  CARVE_FAMILY_QUERIES,
  defaultResolveEncounter,
  defaultResolveOneWayRealisation,
  defaultResolvePassageRealisation,
  defaultResolveRegionBarrierRealisation,
} from "../encounterFallback"
import type { OneWayRefusal } from "../oneWayRealisation"
import type { RegionBarrierRefusal } from "../regionBarrierRealisation"
import type { AssembleFloorKeyRequirements, ResolveEncounter, ResolveKeyRequirements } from "../siteAssembler"
import type { AssemblerFailure, FloorConfig, MechanismRecord, SideSection, SubSection } from "../siteTypes"
import { HANDLE_SIDES } from "../siteTypes"
import { forkOnward, forkSeams, offRouteChains, regionRoute, strandedRegions } from "../regions"
import type { ContentKind, SideChain } from "../regions"
import {
  barrierRuns,
  doorsToEnterRegion,
  dropsLandingOnAStretch,
  floorCorridors,
  isEdgeGate,
  isForkSwitch,
  isRegionGate,
  isSequence,
  isWeights,
  topologyFaults,
} from "../obstacles"
import type { EdgeGateObstacle, FloorCorridor, Obstacle, OneWayObstacle, StatefulControl } from "../obstacles"
import { planToLay } from "../laidFloor"
import type { AbsorbedDemand } from "../laidFloor"
import type { LockPlan } from "../lockPlan"
import { resolveMechanicKind } from "../mechanics"
import { computeLegacyMainSectionHash, computeMainSectionHash } from "./sectionHash"
import {
  GROWN_KEY_HOST,
  MAIN_SECTION_ADDRESS,
  keyHostIdxs,
  owesAKeyHost,
  sectionAddresses,
  sectionsTooDeep,
  withHandleGates,
} from "./sections"
import { chainRooms, gateKeyOf, gatesOwnedBy, handleStem, leverRooms, obstacleMode, switchStem } from "./ids"
import type { AgreementGate, DropSeam, FloorPrep, ForkIn, OneWayDemand, SubSectionsOf } from "./state"

const defaultResolveKeyRequirements: ResolveKeyRequirements = () => undefined

/** The most attempts a floor may take. */
export const ASSEMBLY_ATTEMPTS = 60

// How often the maze continues in the same direction instead of turning, when it can. A plain
// random-direction DFS maze is very serpentine (every step is a coin flip); biasing toward straight runs
// gives longer corridors and fewer forced turns, which reads as "a real place" and needs fewer
// click-to-reveal stops on first traversal. Overridable per floor via FloorConfig.corridorStraightness.
const DEFAULT_STRAIGHT_BIAS = 0.65

export type PrepareFloorResult = { ok: false; reasons: AssemblerFailure["reasons"] } | { ok: true; prep: FloorPrep }

const refuse = (reasons: AssemblerFailure["reasons"]): PrepareFloorResult => ({ ok: false, reasons })

/** Each group is frozen, so a pass that tries to change what the config decided throws. */
const frozen = <T extends Record<string, object>>(groups: T): Readonly<T> => {
  for (const group of Object.values(groups)) Object.freeze(group)
  return Object.freeze(groups)
}

/**
 * EVERYTHING ABOUT A FLOOR THE CONFIG DECIDES, settled once before any attempt carves: the refusals no
 * seed can answer, the compiled mechanisms and marks, and every value the attempts read without drawing.
 */
export const prepareFloor = (
  siteId: string,
  authoredConfig: FloorConfig,
  addressSeed: number,
  resolvers: AssembleFloorKeyRequirements & { resolveEncounter?: ResolveEncounter } = {},
  plan?: LockPlan,
  answerStubs = false
): PrepareFloorResult => {
  const {
    resolveEncounter = defaultResolveEncounter,
    resolveKeyRequirements = defaultResolveKeyRequirements,
    floorRef = { journeyId: siteId, floorIndex: 0 },
    resolveBoardIndex,
    resolveOneWay = defaultResolveOneWayRealisation,
    resolveRegionBarrier = defaultResolveRegionBarrierRealisation,
    resolvePassage = defaultResolvePassageRealisation,
    maxAttempts = ASSEMBLY_ATTEMPTS,
    onLaid,
  } = resolvers
  // Before anything is carved: two sections a save could not tell apart is a data-loss bug, not a
  // layout one, so it fails the floor loudly here rather than quietly sharing one player's progress
  // between two places. `yarn generate-world` and the floor sweep both build every floor, so an
  // authored label that collides cannot reach a player.
  const addresses = sectionAddresses(authoredConfig)
  if (!addresses.ok) return refuse([{ type: "unusableSectionAddress", address: addresses.duplicate }])

  // A section hung below the two levels the carve builds would be authored, serialized and then never
  // exist — the gate, the reward and the rooms on it all quietly absent from the floor a player walks.
  // How deep a config goes is fixed before a seed is chosen, so it is refused by name here rather than
  // dropped, the same way a misnamed one-way is.
  const tooDeep = sectionsTooDeep(authoredConfig, addresses.of)
  if (tooDeep.length > 0) return refuse(tooDeep.map(address => ({ type: "sectionTooDeep" as const, address })))

  // A LAYOUT IS FIXED BY THE CONFIG, NOT BY THE SEED, so a broken one is refused once here rather
  // than blamed on sixty carves that could never have satisfied it either. Ordered so each check can
  // trust what the one before it established: names are unique before connections are resolved
  // against them, and both hold before the walk that finds what nothing reaches.
  const regionLayout = authoredConfig.regionLayout
  const drops = (authoredConfig.obstacles ?? []).flatMap(o =>
    o.kind === "oneWay" ? [[o.at.between[0], o.at.between[1]] as const] : []
  )
  if (regionLayout) {
    const declared = new Set<string>()
    const repeated = new Set<string>()
    for (const { name } of regionLayout.regions) {
      if (declared.has(name)) repeated.add(name)
      declared.add(name)
    }
    if (repeated.size > 0) return refuse([...repeated].map(name => ({ type: "regionNameRepeated" as const, name })))
    const undeclaredEnds = new Set<string>()
    for (const [from, to] of regionLayout.connections)
      for (const end of [from, to]) if (!declared.has(end)) undeclaredEnds.add(end)
    if (undeclaredEnds.size > 0)
      return refuse([...undeclaredEnds].map(name => ({ type: "connectionNamesNoRegion" as const, name })))
    const badPorts = (["in", "out"] as const)
      .filter(port => !declared.has(regionLayout[port]))
      .map(port => ({ type: "portNamesNoRegion" as const, port, name: regionLayout[port] }))
    if (badPorts.length > 0) return refuse(badPorts)
    // A PLACEMENT THAT IS NOT A SHARE OF THE PATH could seat the container nowhere, or seat it
    // differently at every path length; refused rather than clamped into a position nobody wrote.
    const enters = regionLayout.placement?.enters
    if (enters !== undefined && !(Number.isFinite(enters) && enters >= 0 && enters < 1))
      return refuse([{ type: "placementOutOfRange" as const, enters }])
    const stranded = strandedRegions(regionLayout, drops)
    if (stranded.length > 0) return refuse(stranded.map(name => ({ type: "regionUnreachable" as const, name })))
  }

  // REFUSED BEFORE A WALL IS CARVED, like the region checks above and for the same reason: which
  // regions exist, what joins them and which route the main path threads are all fixed by the config,
  // so a misnamed id is answered once here rather than blamed on sixty carves that could never have
  // satisfied it.
  const topologyProblems = topologyFaults(
    regionLayout,
    authoredConfig.obstacles ?? [],
    authoredConfig.controls ?? [],
    authoredConfig.forks ?? [],
    authoredConfig.barrierOrder ?? [],
    resolveMechanicKind,
    { laid: plan !== undefined }
  )
  if (topologyProblems.length > 0) return refuse(topologyProblems)

  // An authored one-way naming a section this floor does not have is the same kind of mistake: which
  // sections exist is fixed by the config, not by the seed, so a misnamed end is refused once here
  // rather than blamed on sixty carves that could never have satisfied it either. The region-addressed
  // form (`obstacles`, kind "oneWay") is validated the same way, just against regions instead of
  // sections — `topologyProblems` above already covers it.
  const knownSectionAddresses = new Set<string>([MAIN_SECTION_ADDRESS, ...addresses.of.values()])
  const unusableOneWays = (authoredConfig.oneWays ?? []).filter(
    oneWay => !knownSectionAddresses.has(oneWay.from) || !knownSectionAddresses.has(oneWay.to)
  )
  if (unusableOneWays.length > 0)
    return refuse(unusableOneWays.map(({ from, to }) => ({ type: "oneWayUnsatisfied" as const, from, to })))

  // A ONE-WAY IS CROSSED THROUGH A REALISATION THAT OFFERS ITS PROMPT, so a floor binding none, or one that
  // declares no prompt, is refused by name before a wall is carved: a crossing with no prompt is one the
  // player could take by accident, and nothing may stand in for the role an author forgot to bind. A
  // realisation no registered mod declares is not a mistake in the floor: the carve is the same and the
  // passage degrades to an ordinary two-way one (`degradeUnrealised`).
  const realisationRefusals = [
    ...(authoredConfig.oneWays ?? []),
    ...(authoredConfig.obstacles ?? []).flatMap(o =>
      o.kind === "oneWay" ? [{ from: o.at.between[0], to: o.at.between[1] }] : []
    ),
  ].flatMap(({ from, to }) => {
    const named = authoredConfig.oneWayRealisation
    const bound = resolveOneWay(named)
    const why: OneWayRefusal | undefined = bound
      ? bound.prompt
        ? undefined
        : "noPrompt"
      : named === undefined
        ? "unbound"
        : undefined
    return why ? [{ type: "oneWayRealisationRefused" as const, from, to, realisation: named ?? null, why }] : []
  })
  // A REGION BARRIER IS DRESSED BY A REALISATION BOUND FROM OUTSIDE. Unbound, it is refused by name (barrier and
  // region), never carved with a default. Bound to one no registered mod provides, the carve is the same and the
  // barrier's door is plain ground (`degradeUnrealised`).
  const regionBarrierRefusals = (authoredConfig.obstacles ?? []).filter(isRegionGate).flatMap(barrier =>
    authoredConfig.regionBarrierRealisation === undefined
      ? [
          {
            type: "regionBarrierRealisationRefused" as const,
            id: barrier.id,
            region: barrier.at.region,
            realisation: null,
            why: "unbound" as RegionBarrierRefusal,
          },
        ]
      : []
  )
  const realisationProblems = [...realisationRefusals, ...regionBarrierRefusals]
  if (realisationProblems.length > 0) return refuse(realisationProblems)
  const oneWaysUnrealised =
    authoredConfig.oneWayRealisation !== undefined && resolveOneWay(authoredConfig.oneWayRealisation) === undefined
  const regionBarriersUnrealised =
    authoredConfig.regionBarrierRealisation !== undefined &&
    resolveRegionBarrier(authoredConfig.regionBarrierRealisation) === undefined
  // The realisation a mechanic carries on the carve: the registered one, or the name an absent mod left unanswered.
  const boundOneWay = resolveOneWay(authoredConfig.oneWayRealisation)?.id ?? authoredConfig.oneWayRealisation
  const boundRegionBarrier =
    resolveRegionBarrier(authoredConfig.regionBarrierRealisation)?.id ?? authoredConfig.regionBarrierRealisation

  // A HANDLE'S REACH IS AUTHORED, SO WHAT IT CANNOT REACH IS ANSWERED BEFORE A WALL IS CARVED — the
  // same reasoning, and the same shape, as the one-way above: which sections exist and what each
  // already carries is fixed by the config, so a lever naming one it cannot have is refused once, by
  // the name that failed.
  const sectionByAddress = new Map<string, SideSection | SubSection>()
  for (const [idx, side] of authoredConfig.sideSections.entries()) {
    sectionByAddress.set(addresses.of.get(`s${idx}`) ?? `s${idx}`, side)
    for (const [subIdx, sub] of (side.sideSections ?? []).entries())
      sectionByAddress.set(addresses.of.get(`s${idx}.${subIdx}`) ?? `s${idx}.${subIdx}`, sub)
  }
  const gateKey = (id: string) => gateKeyOf(floorRef, id)
  // THE PASSAGES THIS FLOOR'S GATES WERE BOUND TO, by the key their doors ask for: only those a registered mod
  // declares, so a passage whose mod is absent stays the door its owners make it.
  const passageKeys = new Map(
    (authoredConfig.obstacles ?? [])
      .filter(isEdgeGate)
      .flatMap(o =>
        o.passage !== undefined && resolvePassage(o.passage) !== undefined ? [[gateKey(o.id), o.passage] as const] : []
      )
  )
  // THE SHAPE BOTH AUTHORING PATHS COMPILE THROUGH: a handle is the two-state case of a control, so
  // the same four fields drive the same compile step whichever wrote them — `id` and `in` are a
  // control's own, not this compile step's business.
  type Mechanism = Pick<StatefulControl, "states" | "initial" | "returnsToInitial" | "opens">
  // ONE MECHANISM-BUILDING PATH: `opens` names obstacles by id; `resolveGateKey` says what gate key
  // each id mints — a control mints one from the obstacle's own authored id (`gateKeyOf`), a handle
  // already knows each driven section's key and hands it back verbatim. Iterates `states`, not
  // `Object.entries(opens)`, so compiled order follows what the author declared.
  const compileMechanism = (
    mechanism: Mechanism,
    resolveGateKey: (obstacleId: string) => string,
    modeOf: (obstacleId: string) => "any" | undefined = () => undefined
  ): MechanismRecord => ({
    states: mechanism.states,
    initial: mechanism.initial,
    returnsToInitial: mechanism.returnsToInitial,
    positions: mechanism.states.flatMap(state =>
      (mechanism.opens[state] ?? []).map(id => {
        const mode = modeOf(id)
        return { state, gateKeyId: resolveGateKey(id), ...(mode ? { mode } : {}) }
      })
    ),
  })
  const handleGateKeyByAddress = new Map<string, string>()
  const leverByAddress = new Map<string, MechanismRecord>()
  // THE PAIR BOTH ENDS WEAR, by the gate key that already names one end: a mechanism's room is found
  // again through the keys its own positions carry, so nothing has to re-derive which section or region
  // a mark is for. One map for handles and controls, read by the single pass over the finished grid that
  // paints marks onto both ends.
  const markByGateKey = new Map<string, Mark>()
  // Every mechanic that wears a mark, in AUTHORING ORDER — handles, then controls (fork-switches among
  // them) as the config lists them, then switches — each with the gate keys it wears it on. The order
  // is what `allocateMarks` settles a glyph collision by, so it is fixed here and nowhere else.
  const markedMechanics: (MarkRequest & { gateKeys: string[] })[] = []
  for (const [n, handle] of (authoredConfig.handles ?? []).entries()) {
    const refuseHandle = (address: string) => refuse([{ type: "handleUnsatisfied", handle: n, address }])
    // Two levers in one section would answer to the same name in a save (cellSlot.ts), which is the
    // data-loss bug the address checks above exist for. A lever naming no section on either side is
    // refused by the same name: it drives nothing, so it is a room the player taps with no door on the
    // end of it, and an authoring typo should say so here rather than reach the world as a floor.
    if (
      !knownSectionAddresses.has(handle.in) ||
      leverByAddress.has(handle.in) ||
      handle.left.length + handle.right.length === 0
    )
      return refuseHandle(handle.in)
    // A HANDLE IS THE TWO-STATE CASE OF A CONTROL: what it drives becomes `opens`, keyed by side and
    // naming the driven section's own address, so the same compile step a control goes through mints
    // its mechanism record below. BOTH SIDES ARE READ THE SAME WAY AND INTO THE SAME INDEX, which is
    // what makes a section named on both sides refuse itself: the second naming finds the first one's
    // gate already written, exactly as a second handle driving it would. Such a door is one the lever
    // could neither open nor close.
    const opens: Record<string, string[]> = {}
    const handleGateKeys: string[] = []
    for (const side of HANDLE_SIDES) {
      opens[side] = []
      for (const driven of handle[side]) {
        // The main path has no entrance to gate; the lever's own section would shut the lever in behind
        // the door it opens; and a section already gated — by an author or by another handle — would
        // lose one of the two doors without saying so.
        if (
          !sectionByAddress.has(driven) ||
          driven === handle.in ||
          sectionByAddress.get(driven)?.gate !== undefined ||
          handleGateKeyByAddress.has(driven)
        )
          return refuseHandle(driven)
        const gateKeyId = `${handleStem(floorRef, n)}:${driven}`
        handleGateKeyByAddress.set(driven, gateKeyId)
        handleGateKeys.push(gateKeyId)
        opens[side].push(driven)
      }
    }
    markedMechanics.push({
      id: `handle:${handle.in}`,
      seed: hashString(`handle|${handle.in}`),
      gateKeys: handleGateKeys,
    })
    // A LEVER DECLARES BOTH SIDES WHATEVER IT DRIVES, so the walk knows a door can be shut again even
    // where the far side names no gate of its own. It hangs on `starts` before anyone touches it — so
    // those gates stand open on arrival without the carve having to place an already-open door
    // (mechanismDoors.ts reads `initial` for exactly that) — and can always be thrown back. The gate
    // key each driven section mints is already known (`handleGateKeyByAddress`, above), so the resolver
    // hands it back rather than minting one the way a control's own obstacle id does.
    leverByAddress.set(
      handle.in,
      compileMechanism(
        { states: [...HANDLE_SIDES], initial: handle.starts ?? HANDLE_SIDES[0], returnsToInitial: true, opens },
        driven => handleGateKeyByAddress.get(driven)!
      )
    )
  }

  // A GATE ASKING FOR A FLOOR KEY NAMES A SECTION THAT HAS ONE: the key is the one that section's own floor-key
  // door wants, so a section with no such gate leaves the gate waiting on a key nothing mints.
  for (const obstacle of authoredConfig.obstacles ?? [])
    for (const section of obstacle.kind === "gate" ? (obstacle.floorKeys ?? []) : [])
      if (sectionByAddress.get(section)?.gate?.type !== "floor-key")
        return refuse([{ type: "gateKeyNamesNoFloorKey", id: obstacle.id, section }])

  // A CONTROL IS COMPILED INTO THE RECORD THE WALK ALREADY EATS, the same step a handle desugars
  // through above. `opens` names obstacles by their authored ids; `positions` names the gate keys
  // those ids mint, one entry per obstacle per state that opens it — several entries may share a
  // state, which is what lets one position open a set.
  const forkSwitches = (authoredConfig.controls ?? []).filter(isForkSwitch)
  // A SEQUENCE IS NOT COMPILED HERE: its record places each move at a cell, and the cells only exist once
  // the carve has stood its tiles (`placeSequences`, last).
  const sequences = (authoredConfig.controls ?? []).filter(isSequence)
  // Nor are a lock's stones: their moves are placed at the plates, which stand last too (`placeWeights`).
  const weights = (authoredConfig.controls ?? []).filter(isWeights)
  const controlRecords = (authoredConfig.controls ?? []).flatMap(control =>
    isForkSwitch(control) || isSequence(control) || isWeights(control)
      ? []
      : [{ control, record: compileMechanism(control, gateKey, id => obstacleMode(authoredConfig, id)) }]
  )
  // A CONTROL AND EVERY OBSTACLE IT OPENS WEAR ONE MARK, so the map reads "this lever, these doors" as
  // one pair the same way a handle's does. The glyph it prefers is hashed from the AUTHORED obstacle
  // id(s) it drives (sorted, so `opens`' state order does not matter) or, for a fork-switch, the gates
  // it owns — stable across a re-carve and never an ordinal. A control that opens nothing names no
  // obstacle to pair with, so it gets no mark.
  for (const control of authoredConfig.controls ?? []) {
    // The stones wear no mark: a door waiting on plates shows its plates itself (mechanic-contract.md, "A gate
    // shows its own condition").
    if (isWeights(control)) continue
    if (isForkSwitch(control)) {
      const owned = gatesOwnedBy(authoredConfig, control.id)
        .map(gate => gate.id)
        .sort()
      if (owned.length > 0)
        markedMechanics.push({ id: control.id, seed: hashString(owned.join("|")), gateKeys: owned.map(gateKey) })
      continue
    }
    if (isSequence(control)) {
      markedMechanics.push({
        id: control.id,
        seed: hashString([...new Set(control.opens.done)].sort().join("|")),
        gateKeys: control.opens.done.map(gateKey),
      })
      continue
    }
    const drivenIds = [...new Set(Object.values(control.opens).flat())].sort()
    if (drivenIds.length === 0) continue
    const record = controlRecords.find(entry => entry.control === control)!.record
    markedMechanics.push({
      id: control.id,
      seed: hashString(drivenIds.join("|")),
      gateKeys: record.positions.map(position => position.gateKeyId),
    })
  }

  // From here the floor is read with the handles' gates already on it, so every pass that sizes a
  // chain, isolates a section or writes a gate room meets one gate rule rather than two.
  const config =
    handleGateKeyByAddress.size > 0
      ? withHandleGates(authoredConfig, addresses.of, handleGateKeyByAddress)
      : authoredConfig

  // Which chains carry a lever, by the positional key the sizing below has to hand. A lever stands in a
  // room of its own — it is not the k-th puzzle of the chain and takes no content slot — so a chain
  // holding one is carved a room longer.
  const leverAtPositional = new Set<string>()
  for (const [positional, address] of addresses.of) if (leverByAddress.has(address)) leverAtPositional.add(positional)
  if (leverByAddress.has(MAIN_SECTION_ADDRESS)) leverAtPositional.add(MAIN_SECTION_ADDRESS)
  const leverOnMain = leverRooms(leverAtPositional, MAIN_SECTION_ADDRESS) === 1

  const treasureChest = resolveEncounter(CARVE_FAMILY_QUERIES.treasureChest, CARVE_FAMILY_QUERIES.treasureChest)
  const fezShop = resolveEncounter(CARVE_FAMILY_QUERIES.fezShop, CARVE_FAMILY_QUERIES.fezShop)
  const keyGate = resolveEncounter(CARVE_FAMILY_QUERIES.keyGate, CARVE_FAMILY_QUERIES.keyGate)

  // How many junctions this floor reserves for something to stand in, and how wide each has to be.
  // Widest demand first, so a wide one is never left with only a narrow junction to take.
  const forkDemands = (config.forks ?? [])
    .flatMap(f => ("in" in f ? [] : Array.from({ length: f.count }, () => f.exits)))
    .sort((a, b) => b - a)

  // A `{ in }` FORK IS RESOLVED AGAINST THE LAYOUT ALONE — `regionLayout` and `forks`, both core — so the
  // junction it asks for carves the same with the topology mod on or off. Which chains hang off the
  // named region, and which section hosts each, is fixed by the config, so a region that cannot hold
  // the junction is refused once here by name rather than blamed on sixty carves. Only a chain joined to
  // its mouth by a connection is a way out a junction can have: one a drop alone joins has no corridor.
  const joinedByConnection = (a: string, b: string) =>
    (regionLayout?.connections ?? []).some(([x, y]) => (x === a && y === b) || (x === b && y === a))
  const forkIns: ForkIn[] = []
  if (config.forks?.some(f => "in" in f)) {
    const layoutChains = regionLayout ? offRouteChains(regionLayout, drops) : []
    const routeRegions = new Set(regionLayout ? regionRoute(regionLayout) : [])
    for (const fork of config.forks) {
      if (!("in" in fork)) continue
      const region = fork.in
      const refuseFork = (cause: "contradictsCounts" | "notInLayout" | "offRoute" | "fewerThanTwoSeams" | "repeated") =>
        refuse([{ type: "forkRegionRefused", region, cause }])
      if ("exits" in fork || "count" in fork) return refuseFork("contradictsCounts")
      if (!regionLayout?.regions.some(r => r.name === region)) return refuseFork("notInLayout")
      if (!routeRegions.has(region)) return refuseFork("offRoute")
      if (forkIns.some(other => other.region === region)) return refuseFork("repeated")
      const seams: [string, string][] = []
      const sectionIdxs: number[] = []
      // A laid floor's junction is laid for its plan's arms, which may meet again beyond it; a floor carved as side
      // chains matches each seam to the side section hosting its chain.
      if (plan) {
        seams.push(...forkSeams(regionLayout, region, drops, { laid: true }))
        // The route's way on is one of its ways too when the switch owns a gate on it.
        const onward = forkOnward(regionLayout, region)
        const arms = plan.junctions.find(junction => junction.region === region)?.arms ?? []
        if (
          onward &&
          plan.corridors.some(c => c.onRoute && arms.includes(c.id) && onward.includes(c.from) && onward.includes(c.to))
        )
          seams.push(onward)
      } else
        layoutChains.forEach((chain, i) => {
          if (chain.mouth !== region || chain.regions.length === 0 || !joinedByConnection(region, chain.regions[0]))
            return
          seams.push([region, chain.regions[0]])
          if (i < config.sideSections.length) sectionIdxs.push(i)
        })
      if (seams.length < 2) return refuseFork("fewerThanTwoSeams")
      forkIns.push({ region, seams, sectionIdxs })
    }
  }

  // A SWITCH'S ROOM HAS TO STAY OPEN. It opens one of its ways out and leaves the others shut, and keys
  // accumulate — so a player who spent the choice on a side branch pays for the main path onward with a
  // walk back to the switch, not with the run. A family whose room closes behind the player has no walk
  // back to offer, and leaves them at a door they can never open. Asked here rather than re-carved: no
  // seed changes which family was authored.
  if (config.switches) {
    const switchFamily = resolveEncounter(config.switches.encounter, "puzzle")
    // A family no registered mod provides leaves a bare junction (`degradeUnrealised`); one that IS provided
    // and cannot be walked back into is the mistake.
    if (switchFamily.ownerMod !== undefined && !switchFamily.reEnterable)
      return refuse([{ type: "switchFamilyNotReEnterable", family: switchFamily.familyId }])
    // More switches than there are junctions held for them is a contradiction between the two
    // statements, which no seed can settle — so it is answered before a single wall is carved.
    if (config.switches.min > forkDemands.length)
      return refuse([{ type: "switchesExceedForks", min: config.switches.min, forks: forkDemands.length }])
  }

  // A SWITCH IS A MECHANIC TOO, AND HOW MANY THERE ARE IS FIXED BY THE CONFIG: every reserved junction
  // is one of `forkDemands` and `switchesPlaced` takes the first `max` of them. Each wears the mark its
  // authoring stem prefers, on the junction and on every door `closeWaysOut` mints.
  const switchCount = config.switches ? Math.min(config.switches.max, forkDemands.length) : 0
  for (let n = 0; n < switchCount; n++)
    markedMechanics.push({ id: `switch:${n}`, seed: hashString(switchStem(floorRef, n)), gateKeys: [] })
  // MORE MECHANICS THAN THERE ARE GLYPHS IS ANSWERED HERE, BEFORE A WALL IS CARVED: the count is fixed by
  // the config, and a mark shared between two mechanics would say one drives the other's door.
  const tileRequests: MarkRequest[] = sequences.flatMap(sequence =>
    sequence.steps.map((_, step) => ({
      id: `${sequence.id}#${step}`,
      seed: hashString(`sequence|${sequence.id}|${step}`),
    }))
  )
  const allocation = allocateMarks(markedMechanics, tileRequests)
  if (allocation.unmarked.length > 0) return refuse([{ type: "marksExhausted", ids: allocation.unmarked }])
  for (const mechanic of markedMechanics)
    for (const gateKeyId of mechanic.gateKeys) markByGateKey.set(gateKeyId, allocation.marks.get(mechanic.id)!)

  // Hidden sections are included in maze generation (tagged hidden:true on cells) but masked by
  // useAssembledFloor — so they are carved, but they are not asked to host a key.
  const sideSections: SideSection[] = owesAKeyHost(config.sideSections.filter(s => !s.hidden))
    ? [...config.sideSections, GROWN_KEY_HOST]
    : config.sideSections
  const { gatedIdxs: gatedFloorKeyIdxs, ungatedIdxs } = keyHostIdxs(sideSections)

  // The auto-injection above guarantees a free host whenever one's needed — this is a
  // structural safety net, not an expected path: if a floor-key gate still has nowhere to
  // put its key, that's an unsolvable floor, not a per-seed maze fluke, so it fails
  // immediately rather than burning every retry attempt on something a different seed can't fix.
  if (gatedFloorKeyIdxs.length > 0 && ungatedIdxs.length === 0) return refuse([{ type: "noUngatedSectionForKey" }])

  // A TOPOLOGY GATE AT A CHAIN'S OWN MOUTH AND A SECTION'S OWN `gate` BOTH CLAIM `cells[0]` — checked
  // here because which side section a chain matches to (offRouteChains groups off-route regions in
  // declaration order, the Nth chain to the Nth authored side section) and which obstacle stands on a
  // chain's mouth connection are both fixed by the config alone, never by the seed: a mouth obstacle's
  // seam is always the chain's first hosted region (`regionOfStep` always seats the first-declared
  // region from the front), so it always resolves to `cellIndex === 0`, the same cell a floor-key or
  // tomb-key gate always claims. Refused by name rather than made to work by shifting one vocabulary
  // around the other — a side section that hosts an off-route chain and ALSO authors its own gate is
  // asking two authoring surfaces to run the same cell, and the two must stay genuinely independent
  // rather than merely non-colliding by luck.
  if (regionLayout && !plan) {
    const mouthGateCollisions = offRouteChains(regionLayout, drops).flatMap((chain, i) => {
      if (i >= config.sideSections.length || !config.sideSections[i].gate) return []
      // A ONE-WAY NEVER COLLIDES HERE: it mints no gate room and claims no cell of its own, so only a
      // GATE at the mouth is the collision this check exists for.
      const mouthObstacle = (authoredConfig.obstacles ?? []).filter(isEdgeGate).find(o => {
        const [a, b] = o.at.between
        return (a === chain.mouth && b === chain.regions[0]) || (b === chain.mouth && a === chain.regions[0])
      })
      return mouthObstacle ? [{ address: `s${i}`, obstacleId: mouthObstacle.id }] : []
    })
    if (mouthGateCollisions.length > 0)
      return refuse(
        mouthGateCollisions.map(({ address, obstacleId }) => ({
          type: "chainGateCollidesWithSectionGate" as const,
          address,
          obstacleId,
        }))
      )
  }

  // EVERY SUB-SECTION LEVEL OWES ITS KEYS A HOST THE SAME WAY, and which sections it holds is the config's
  // alone, so a level with a floor-key gate and nowhere free to put the key is refused here too.
  const subSectionsOf = new Map<number, SubSectionsOf>()
  for (const [idx, parent] of sideSections.entries()) {
    if (!parent.sideSections?.length) continue
    const sections: SubSection[] = owesAKeyHost(parent.sideSections.filter(s => !s.hidden))
      ? [...parent.sideSections, GROWN_KEY_HOST]
      : parent.sideSections
    const { gatedIdxs, ungatedIdxs: subUngated } = keyHostIdxs(sections)
    if (gatedIdxs.length > 0 && subUngated.length === 0) return refuse([{ type: "noUngatedSectionForKey" }])
    subSectionsOf.set(idx, { sections, gatedIdxs, ungatedIdxs: subUngated })
  }

  // A GATE OR A CONTROL ROOM IS NOT SIZED IN HERE — deliberately. Both are owned by the topology mod
  // (FloorConfig.obstacles/controls) and dropped along with it when that mod is off, so a term for
  // either in the path's minimum length would make the maze walk a different distance with the mod on
  // than with it off: the whole floor would re-carve, not just lose a mod's furniture. A gate or
  // control room instead occupies a node the path already has — the same one content would otherwise
  // use (see `placedContent`'s forward-shift and `controlNotSeated`/`obstacleSeamNotCarved`) — so
  // toggling the mod off is identical BY CONSTRUCTION: the maze never sees it existed
  // (docs/game-design/regions-and-containers.md, "the identical walls carve with every connection
  // open").

  // Minimum node count for the main path alone (entrance, its own content, goal, exit) —
  // kept separate from `minCells` below (which folds in every side-section's cost too) so
  // `packing`'s path-length target scales with what the *main path itself* needs, not with
  // how much unrelated side-section content happens to branch off it elsewhere.
  const mainPathCells =
    1 /* entrance */ +
    config.pathPuzzles +
    1 /* goal */ +
    1 /* exit/stairhead */ +
    leverRooms(leverAtPositional, MAIN_SECTION_ADDRESS)

  // A junction `forks` holds on a laid floor hangs its branches from a route node no room takes, so the route is laid
  // one node longer for each.
  const junctionNodes = plan ? forkDemands.length : 0
  // A lock floor is laid before anything grows around it, so its stretches and corridors take room the
  // authored sections do not.
  const appetiteOfRegion = new Map((regionLayout?.regions ?? []).map(region => [region.name, region.appetite]))
  const layPlan = plan
    ? planToLay(plan, {
        content: [
          ...Array.from(
            { length: config.pathPuzzles + leverRooms(leverAtPositional, MAIN_SECTION_ADDRESS) },
            (): ContentKind => "puzzle"
          ),
          "reward",
          ...Array.from({ length: junctionNodes }, (): ContentKind => "puzzle"),
        ],
        appetite: appetiteOfRegion,
      })
    : undefined
  // AN UNGATED SIDE SECTION IS CONTENT, NOT A BRANCH: a section whose entrance carries no door (no gate of its
  // own, not sealed, not hidden), that hangs nothing off itself, ends in a chest or shop, holds no lever and
  // is not named by a one-way, has its rooms stood on laid corridor and region nodes. A gated, keyed, sealed or
  // hidden section stays a branch off laid ground, because a gate needs a branch to stand on.
  const oneWayNames = new Set((config.oneWays ?? []).flatMap(way => [way.from, way.to]))
  const isContentSection = (section: SideSection, i: number): boolean =>
    plan !== undefined &&
    !section.gate &&
    !section.sealed &&
    !section.hidden &&
    !section.sideSections?.length &&
    section.end === "treasure" &&
    leverRooms(leverAtPositional, `s${i}`) === 0 &&
    !oneWayNames.has(addresses.of.get(`s${i}`) ?? `s${i}`)
  // The section hosting the key a floor-key gate waits on stands on ground no door shuts: nothing opens a door
  // for the player to fetch the key that opens another.
  const hostsKeys = (section: number) => gatedFloorKeyIdxs.length > 0 && ungatedIdxs[0] === section
  // A JUNCTION `forks` HOLDS ON A LAID FLOOR CHOOSES BETWEEN BRANCHES: every node the lay gives holds a room, so
  // the last ungated sections, as many as the junctions have ways out, stay branches and hang from a bare node
  // of the route as a hub of their own (`junctionGroups` below).
  const contentCandidates = sideSections.flatMap((section, i) =>
    isContentSection(section, i) && !hostsKeys(i) ? [i] : []
  )
  const junctionWays = plan ? forkDemands.reduce((sum, exits) => sum + exits, 0) : 0
  const junctionSections = junctionWays > 0 ? contentCandidates.slice(-junctionWays) : []
  const contentSections = new Set(
    sideSections.flatMap((section, i) => (isContentSection(section, i) && !junctionSections.includes(i) ? [i] : []))
  )
  const absorbedDemands: AbsorbedDemand[] = [...contentSections].map(section => ({
    section,
    kinds: [
      ...Array.from({ length: sideSections[section].pathPuzzles }, (): ContentKind => "puzzle"),
      "reward" as const,
    ],
    ...(hostsKeys(section) ? { open: true } : {}),
  }))
  const lockCells = layPlan
    ? layPlan.regions.reduce((sum, region) => sum + Math.max(2, region.minNodes), 0) +
      layPlan.corridors.reduce((sum, corridor) => sum + corridor.minNodes + 1, 0)
    : 0

  // Minimum node count needed (real path nodes only — the connector cell between two
  // adjacent nodes lives at a separate, non-node grid position).
  const minCells =
    mainPathCells +
    lockCells +
    sideSections.reduce((sum, sec, idx) => {
      const secCells = chainRooms(leverAtPositional, sec, `s${idx}`)
      const subCells = (sec.sideSections ?? []).reduce(
        (s2, sub, subIdx) => s2 + chainRooms(leverAtPositional, sub, `s${idx}.${subIdx}`),
        0
      )
      return sum + secCells + subCells
    }, 0)

  // Rough count of fork/endpoint rooms that will want a decorative multi-cell footprint
  // later — a one-pass estimate is fine since that pass is best-effort (claims whatever's
  // free, never fails).
  const subSectionCount = sideSections.reduce((s, sec) => s + (sec.sideSections?.length ?? 0), 0)
  const expectedFootprintRooms =
    sideSections.length /* forks */ +
    2 /* main end + exit */ +
    sideSections.length /* section ends */ +
    subSectionCount /* sub-section ends */

  // WHICH REGIONS THE ROUTE THREADS, and the regions it does not, which seat on a side path instead —
  // matched to a top-level side section deterministically by CONFIG order (offRouteChains groups
  // off-route regions in declaration order, and the Nth chain takes the Nth authored side section),
  // never by which cell the carve happens to attach a branch near. More chains than the floor authors
  // side sections for leaves the excess unmatched here; that shows up as a genuinely unseated region
  // once the carve is finished, not as a fault raised on the config alone, because a wider retry can
  // still grow the floor a side section it did not have room for at attempt 0.
  const route = regionLayout ? regionRoute(regionLayout) : []
  const onRouteSet = new Set(route)
  const sideChains: SideChain[] = regionLayout && !plan ? offRouteChains(regionLayout, drops) : []
  const chainRegionsBySectionIdx = new Map<number, SideChain>()
  sideChains.forEach((chain, i) => {
    if (i < config.sideSections.length) chainRegionsBySectionIdx.set(i, chain)
  })
  // A SIDE PATH THE LAYOUT JOINS TO ITS MOUTH BY A DROP ALONE has no corridor to its mouth to carve:
  // the seam IS the drop's run, launch, obstacle cells and landing, between the mouth's node and the
  // chain's first one, falling the way the author wrote it (`mouthFirst`: the drop is authored
  // `[mouth, first region]`). A corridor carved there anyway is a walkable join nobody authored, and
  // the lock walk would flood the real cells through it.
  const dropSeams = new Map<number, DropSeam>()
  sideChains.forEach((chain, i) => {
    if (i >= config.sideSections.length || chain.regions.length === 0) return
    const first = chain.regions[0]
    if (joinedByConnection(chain.mouth, first)) return
    const drop = (authoredConfig.obstacles ?? [])
      .filter((o): o is OneWayObstacle => o.kind === "oneWay")
      .find(
        o =>
          (o.at.between[0] === chain.mouth && o.at.between[1] === first) ||
          (o.at.between[1] === chain.mouth && o.at.between[0] === first)
      )
    if (drop)
      dropSeams.set(i, {
        obstacleId: drop.id,
        mouth: chain.mouth,
        mouthFirst: drop.at.between[0] === chain.mouth,
        realisation: boundOneWay!,
      })
  })

  // GATES ONLY seat on a seam: a one-way obstacle seats through its own search — its two regions need not
  // touch at all. A REGION BARRIER stands INSIDE its region rather than on a seam, so its doors are seated
  // once the nodes they may not take are known.
  const gateObstacles = (authoredConfig.obstacles ?? []).filter(isEdgeGate)
  const regionBarriers = (authoredConfig.obstacles ?? []).filter(isRegionGate)
  const oneWayObstacles = (authoredConfig.obstacles ?? []).filter((o): o is OneWayObstacle => o.kind === "oneWay")
  const onRouteObstacle = (o: EdgeGateObstacle) => onRouteSet.has(o.at.between[0]) && onRouteSet.has(o.at.between[1])
  // A CONTROL STANDING IN AN OFF-ROUTE REGION is sought within its own chain once that chain's cells are
  // carved: the main path's search asks only the route's regions, and would find it no candidate ever.
  const mainPathControls = controlRecords.filter(({ control }) => onRouteSet.has(control.in))
  const offRouteControls = controlRecords.filter(({ control }) => !onRouteSet.has(control.in))
  // Every connection's gates in the order stated; one gate is a run of its own.
  const runs = barrierRuns(authoredConfig.obstacles ?? [], authoredConfig.barrierOrder ?? [])
  const mainPathRuns = runs.filter(run => run.gates.every(onRouteObstacle))
  const offRouteRuns = runs.filter(run => !run.gates.every(onRouteObstacle))

  // WHICH DOORS MUST BE EARNED TO STAND IN A REGION, by the gates bounding it, and its structural twin: every
  // connection `regionLayout` declares stands in for an obstacle, gated or not, so the bypass check reserves
  // the same stray edges whether or not the topology mod is in the build. GATES only: a one-way's `between`
  // is typically not even a real connection of the layout, so asking `doorsToEnterRegion` to remove it
  // would at best be a no-op and at worst misread a shortcut as a door nothing on the floor actually bars.
  const layoutCorridors = regionLayout
    ? floorCorridors(regionLayout, authoredConfig.obstacles ?? [], authoredConfig.barrierOrder ?? [])
    : []
  const regionDoors = regionLayout ? doorsToEnterRegion(regionLayout, gateObstacles, layoutCorridors) : undefined
  // `id` is a seam's own name, never an authored obstacle's — it never reaches `gateKeyOf` or a room's
  // `requiredKeyId`, only the seam-behind set-equality check.
  const asSeamObstacle = ({ between: [a, b], index }: FloorCorridor): Obstacle => ({
    id: index === 0 ? `seam:${a}::${b}` : `seam:${a}::${b}#${index}`,
    kind: "gate",
    at: { on: "connection", between: [a, b], corridor: index },
  })
  const regionSeamDoors = regionLayout
    ? doorsToEnterRegion(
        regionLayout,
        layoutCorridors.filter(corridor => corridor.drop === undefined).map(asSeamObstacle),
        layoutCorridors
      )
    : undefined

  // THE GATES THE CARVE AGREEMENT ASKS OF THE WALLS, with the regions each bounds.
  const gateKeys: AgreementGate[] = runs.flatMap(run =>
    run.gates.map((o, i) => ({
      id: o.id,
      between: o.at.between,
      key: gateKey(o.id),
      // A gate on a falling corridor stands on a stretch of its own region and bounds no region a drop lands in.
      bounds: run.falling
        ? []
        : [...(i === 0 ? [run.between[0]] : []), ...(i === run.gates.length - 1 ? [run.between[1]] : [])],
    }))
  )
  // A drop with a gate past it lands on its own stretch, laid for it, never in its region's ground.
  const landsOnItsStretch = dropsLandingOnAStretch(authoredConfig.obstacles ?? [], authoredConfig.barrierOrder ?? [])

  // TWO AUTHORING SURFACES, ONE CARVE: `config.oneWays` names two section addresses, `oneWayObstacles`
  // (kind "oneWay") names two regions. Both resolve to "which cells carry this label", answered off a
  // different map, so one demand list carries both. A drop a seam already carries is no demand.
  const seamDropIds = new Set([...dropSeams.values()].map(seam => seam.obstacleId))
  const oneWayDemands: OneWayDemand[] = [
    ...(config.oneWays ?? []).map(w => ({
      id: undefined,
      from: w.from,
      to: w.to,
      realisation: boundOneWay!,
      sectioned: true,
    })),
    ...oneWayObstacles
      .filter(o => !seamDropIds.has(o.id))
      .map(o => ({
        id: o.id,
        from: o.at.between[0],
        to: o.at.between[1],
        realisation: boundOneWay!,
        sectioned: false,
      })),
  ]

  // Bundle side sections onto shared branch points ("hubs") instead of every section scattering to its
  // own private fork — a floor with many side sections reads as a few significant crossroads rooms rather
  // than many forgettable single junctions. Group size scales with how many sections there are; low counts
  // stay ungrouped (one fork per section).
  const branchSections = sideSections.map((_, i) => i).filter(i => !contentSections.has(i))
  const hubGroupSize = branchSections.length >= 5 ? 3 : branchSections.length >= 2 ? 2 : 1
  // A `{ in }` fork's sections are a hub of their own, first, hung from its junction and nowhere else.
  const forkGroups = forkIns.map(fork => fork.sectionIdxs)
  // Then, on a laid floor, each junction `forks` holds: its branches, hung from one bare node of the route.
  const junctionGroups = forkDemands.flatMap((exits, k) => {
    const at = forkDemands.slice(0, k).reduce((sum, ways) => sum + ways, 0)
    const group = junctionSections.slice(at, at + exits)
    return group.length > 0 ? [group] : []
  })

  // Only FREE (no endReward) treasure-end gated sections can relay the next key onward; staircase-end
  // sections are always leaves, so they come last in the key chain.
  const gatedTreasureIdxs = gatedFloorKeyIdxs.filter(i => sideSections[i].end !== "staircase")
  const gatedStaircaseIdxs = gatedFloorKeyIdxs.filter(i => sideSections[i].end === "staircase")

  const mainIsolated = Boolean(config.sealed)

  return {
    ok: true,
    prep: frozen({
      input: {
        siteId,
        floorRef,
        // The seed a floor was told wins over the one its address derives, so every caller that carves the
        // floor agrees without re-deriving it.
        seed: config.seed ?? addressSeed,
        plan,
        answerStubs,
        maxAttempts,
        onLaid,
        resolveEncounter,
        resolveKeyRequirements,
        resolveBoardIndex,
        resolveOneWay,
        resolveRegionBarrier,
        resolvePassage,
      },
      config: { config, authored: authoredConfig, addressOf: addresses.of },
      layout: {
        regionLayout,
        drops,
        route,
        onRouteSet,
        sideChains,
        chainRegionsBySectionIdx,
        dropSeams,
        layoutCorridors,
        regionDoors,
        regionSeamDoors,
      },
      realisation: {
        oneWaysUnrealised,
        regionBarriersUnrealised,
        oneWay: boundOneWay,
        regionBarrier: boundRegionBarrier,
        passageKeys,
      },
      mechanisms: {
        controlRecords,
        mainPathControls,
        offRouteControls,
        forkSwitches,
        sequences,
        weights,
        leverByAddress,
        handleGateKeyByAddress,
        leverAtPositional,
      },
      obstacles: {
        gateObstacles,
        regionBarriers,
        oneWayObstacles,
        runs,
        mainPathRuns,
        offRouteRuns,
        gateKeys,
        landsOnItsStretch,
        oneWayDemands,
      },
      marks: { allocation, markByGateKey },
      families: { treasureChest, fezShop, keyGate },
      forks: { forkDemands, forkIns, forkGroups, junctionGroups },
      sections: {
        sideSections,
        gatedFloorKeyIdxs,
        ungatedIdxs,
        subSectionsOf,
        contentSections,
        junctionSections,
        absorbedDemands,
        appetiteOfRegion,
        branchSections,
        hubGroupSize,
        gatedTreasureIdxs,
        gatedStaircaseIdxs,
      },
      sizing: {
        mainPathCells,
        minCells,
        lockCells,
        expectedFootprintRooms,
        junctionNodes,
        layPlan,
        contentCount: config.pathPuzzles + 1 /* goal */ + leverRooms(leverAtPositional, MAIN_SECTION_ADDRESS),
        leverOnMain,
        straightBias: config.corridorStraightness ?? DEFAULT_STRAIGHT_BIAS,
        // The authored wish is where the ladder STARTS, not what it is held to.
        packing: config.packing ?? DEFAULT_PACKING,
      },
      hashes: {
        mainIsolated,
        mainSectionHash: computeMainSectionHash(config, mainIsolated),
        legacyMainSectionHash: computeLegacyMainSectionHash(config),
      },
    }),
  }
}
