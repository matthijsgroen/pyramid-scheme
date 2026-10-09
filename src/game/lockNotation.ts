// A LOCK WRITTEN AS TEXT, one line per join, read into the shared Lock type (lockAuthoring.ts). The
// notation is LOCK_SYNTAX, which `yarn lock` also prints so nobody has to remember it.
import { CARRY_TERMS, isWeightOwner, unladenFaults } from "./lockAuthoring"
import type { Alignment, Lock, LockConnection, LockGate, LockMechanic, LockOneWay } from "./lockAuthoring"
import { TORCH_STATES } from "./mechanics/torch"
import { stoneArrangements } from "./mechanics/weights"
import type { RegionAppetite } from "./regions"

export const LOCK_SYNTAX = `
  in -- hall                    corridor, nothing on it; in and out are the way in and the way out
  in -[S1]- hall                gate: open while S1 is in its second state
  in -[S1:a]- hall              gate: open while S1 is in state a
  in -[A+B]- hall               every owner   ·   -[A|B]- any owner
  hall >> in   in << hall       a drop, one-way along the arrow, taken only with empty hands
  in -[Y]- >> hall              one corridor, its items in order from the left region, apart by spaces
  in -[A]--- hall   in ---[A]- hall   aligned left: right after what stands left of it; aligned right: right before
  in --[A]-- hall               centred: room for puzzles either side   ·   -[A]- free: the carve decides
  in -[Y]- hall   hall >> in    two lines on one pair: two corridors side by side
  hall -[sluice:wet]            region gate: hall impassable unless sluice is wet
  S1 toggle @s1                 two states a b, back and forth, starts at a
  sluice toggle @hall dry wet   the same, its states named
  T1 activator @hall            off then on, for good: a floor key, or a prize; water and sand never touch it
  T torch @hall   T torch @hall lit   off until lit, or lit from the start; water or sand over its region
                                puts it out, and it can be lit again
  Y fork @in                    a fork puzzle: the gates naming it are its ways
  P sequence hall vault reset hall-vault   steps in order, reset at that gate; -[P]- opens when done
  p1 plate @hall   p2 plate @hall stone   a plate, empty or with a stone on it; any stone presses any plate
  in -[p1]- hall   in -[p1:empty]- hall    open while a stone rests on p1, or while none does
  in -[unladen]- hall           a narrow passage, only with empty hands; never on a corridor with a drop
  in -&> hall                   the nest spot: another lock may be spliced in here, its in at in, its out at hall;
                                one per lock, a plain corridor where nothing nests, ignored beside other items
  hall *   s2 $   spare ?   corridor -     takes puzzles, a reward, anything, nothing
  // comment
`.slice(1)

export type DraftLock = Lock
/** `refused`: what is wrong with a lock that still reads whole, such as a lever opening nothing, so it can
 * be drawn beside its errors. */
export type ParsedLock = { lock: DraftLock; drafts: string[]; refused: string[] }

const NAME = /^\w+$/
const DEFAULT_STATES = { toggle: ["a", "b"], activator: ["off", "on"] } as const
const APPETITE: Record<string, RegionAppetite> = { "*": "puzzles", $: "reward", "?": "free", "-": "nothing" }

type Item =
  | { kind: "gate"; condition: string; left: number; right: number }
  | { kind: "drop"; arrow: ">>" | "<<" }
  | { kind: "nest" }
type Piece = { spaced: boolean; text: string } & (
  { kind: "region"; name: string } | { kind: "dashes"; count: number } | { kind: "item"; item: Item }
)

// A gate with its dash runs, the nest spot and its two misspellings, a drop, a dash run, a word, a bracket missing a
// dash run, anything else.
const PIECE = /(-+)\[([^\]]*)\](-+)|-&>|-&-|<&-|>>|<<|-+|\w+|-*\[([^\]]*)\]-*|\S/y
const HYPHENATED = /(?:^|\s)(\w+(?:-\w+)+)(?=\s|$)/
const TOUCHING = /\[([^\]]*)\]-*\[([^\]]*)\]/
const ITEMS = "an item is -[…]-, >>, << or -&>"

const written = (item: Item) =>
  item.kind === "gate" ? `-[${item.condition}]-` : item.kind === "drop" ? item.arrow : "-&>"

/** Equal runs of one are free, equal runs of two or more centre, and unequal runs align toward the shorter side. */
const alignmentOf = (left: number, right: number): Alignment | undefined =>
  left === right ? (left === 1 ? undefined : "center") : left < right ? "left" : "right"

/** One connection line as its regions and, between each two, the corridor's items in the order written. */
const readJoins = (line: string, fail: (message: string) => never): { regions: string[]; corridors: Item[][] } => {
  const hyphenated = line.match(HYPHENATED)
  if (hyphenated) fail(`cannot read a region called "${hyphenated[1]}"`)
  const touching = line.match(TOUCHING)
  if (touching) fail(`items on a corridor stand apart: write -[${touching[1]}]- -[${touching[2]}]-`)
  const pieces: Piece[] = []
  let spaced = true
  for (let at = 0; at < line.length;) {
    if (/\s/.test(line[at])) {
      spaced = true
      at++
      continue
    }
    PIECE.lastIndex = at
    const m = PIECE.exec(line)!
    at = PIECE.lastIndex
    const text = m[0]
    if (text === "-&-" || text === "<&-") fail("a nest spot is written a -&> b, from the nested lock's in to its out")
    if (m[4] !== undefined) fail(`a gate stands between dashes: write -[${m[4]}]-`)
    const piece: Piece | undefined =
      m[1] !== undefined
        ? { spaced, text, kind: "item", item: { kind: "gate", condition: m[2], left: m[1].length, right: m[3].length } }
        : text === ">>" || text === "<<"
          ? { spaced, text, kind: "item", item: { kind: "drop", arrow: text } }
          : text === "-&>"
            ? { spaced, text, kind: "item", item: { kind: "nest" } }
            : /^-+$/.test(text)
              ? { spaced, text, kind: "dashes", count: text.length }
              : /^\w+$/.test(text)
                ? { spaced, text, kind: "region", name: text }
                : undefined
    if (!piece) fail(`cannot read "${line}"`)
    pieces.push(piece)
    spaced = false
  }
  // A dash touching a drop belongs to no gate.
  pieces.forEach((piece, i) => {
    if (piece.kind !== "item" || piece.item.kind !== "drop") return
    let [from, to] = [i, i]
    while (from > 0 && !pieces[from].spaced && pieces[from - 1].kind === "dashes") from--
    while (to + 1 < pieces.length && !pieces[to + 1].spaced && pieces[to + 1].kind === "dashes") to++
    if (from < i || to > i)
      fail(
        `cannot read "${pieces
          .slice(from, to + 1)
          .map(p => p.text)
          .join("")}" on a corridor: ${ITEMS}`
      )
  })
  const regions: string[] = []
  const corridors: Item[][] = []
  let items: Item[] = []
  let dashes: number[] = []
  pieces.forEach((piece, i) => {
    if (piece.kind === "region") {
      if (regions.length > 0) {
        if (items.length === 0 && dashes.length === 0) fail(`cannot read "${line}"`)
        if (dashes.length > 0 && (items.length > 0 || dashes.length > 1 || dashes[0] !== 2))
          fail("-- is a bare corridor, exactly two dashes, and carries no items")
        corridors.push(items)
      }
      regions.push(piece.name)
      items = []
      dashes = []
      return
    }
    if (regions.length === 0) fail("a line starts and ends with a region")
    const before = pieces[i - 1]
    if (piece.kind === "item" && before.kind === "item" && !piece.spaced)
      fail(`items on a corridor stand apart: write ${written(before.item)} ${written(piece.item)}`)
    if (piece.kind === "item") items.push(piece.item)
    else dashes.push(piece.count)
  })
  if (items.length > 0 || dashes.length > 0) fail("a line starts and ends with a region")
  if (regions.length < 2) fail(`cannot read "${line}"`)
  return { regions, corridors }
}

type Declared =
  | { control: "toggle" | "activator"; in: string; states: readonly [string, string]; n: number }
  | { control: "flame"; in: string; states: readonly [string, string]; lit: boolean; n: number }
  | { control: "fork-switch"; in: string; n: number }
  | { control: "sequence"; steps: string[]; resetAt: string; n: number }
type Term = { owner: string; state?: string }

export const parseLock = (text: string, name = "lock"): ParsedLock => {
  const fail = (n: number, message: string): never => {
    throw new Error(`line ${n}: ${message}`)
  }
  const lines = text
    .split("\n")
    .map((raw, i) => ({ n: i + 1, line: raw.replace(/\/\/.*/, "").trim() }))
    .filter(({ line }) => line !== "")

  const regions = new Map<string, RegionAppetite>()
  const joins: { between: [string, string]; barriers: string[]; align: Record<string, Alignment>; n: number }[] = []
  const spots: { from: string; to: string; n: number }[] = []
  const gates: Record<string, LockGate> = {}
  const terms: Record<string, { n: number; list: Term[] }> = {}
  const oneWays: Record<string, LockOneWay> = {}
  const declared = new Map<string, Declared>()
  const takes: { region: string; appetite: RegionAppetite; n: number }[] = []
  const plates = new Map<string, { in: string; stone: boolean; n: number }>()
  const plateOpens = new Map<string, { weighted: string[]; empty: string[] }>()

  const unique = (base: string) => {
    let id = base
    for (let k = 2; Object.hasOwn(gates, id) || Object.hasOwn(oneWays, id); k++) id = `${base}#${k}`
    return id
  }
  const region = (n: number, written: string) => {
    if (!NAME.test(written)) fail(n, `cannot read a region called "${written}"`)
    if (!regions.has(written)) regions.set(written, written === "in" ? "puzzles" : "nothing")
    return written
  }
  const condition = (n: number, written: string) => {
    if (written.includes("+") && written.includes("|")) fail(n, `-[${written}]- mixes + and |`)
    const list = written.split(/[+|]/).map(part => {
      const match = part.trim().match(/^(\w+)(?::(\w+))?$/) ?? fail(n, `cannot read owner "${part.trim()}"`)
      return { owner: match[1], state: match[2] }
    })
    const owners = list.map(term => term.owner)
    const twice = owners.find((owner, i) => owners.indexOf(owner) !== i)
    if (twice) fail(n, `-[${written}]- names ${twice} twice`)
    return { list, owners, mode: written.includes("|") ? ("any" as const) : undefined }
  }
  const join = (n: number, from: string, to: string, items: Item[]) => {
    if (from === to) fail(n, `a join leads from ${from} to ${to}`)
    if (items.filter(item => item.kind === "drop").length > 1)
      fail(n, "a corridor falls once: put a region between two drops")
    if (items.some(item => item.kind === "nest")) spots.push({ from, to, n })
    const align: Record<string, Alignment> = {}
    const barriers = items.flatMap(item => {
      if (item.kind === "nest") return []
      if (item.kind === "drop") {
        const [launch, landing] = item.arrow === ">>" ? [from, to] : [to, from]
        const id = unique(`${launch}>${landing}`)
        oneWays[id] = { from: launch, to: landing }
        return [id]
      }
      const { list, owners, mode } = condition(n, item.condition)
      const id = unique(`${from}-${to}`)
      gates[id] = { from, to, owners, ...(mode ? { mode } : {}) }
      terms[id] = { n, list }
      const side = alignmentOf(item.left, item.right)
      if (side) align[id] = side
      return [id]
    })
    joins.push({ between: [from, to], barriers, align, n })
  }
  const placed = (id: string) => declared.has(id) || plates.has(id)
  const declare = (n: number, id: string, what: Declared) => {
    if (placed(id)) fail(n, `${id} is placed twice`)
    declared.set(id, what)
  }

  for (const { n, line } of lines) {
    let m: RegExpMatchArray | null
    if ((m = line.match(/^(\w+)\s+torch\s+@(\w+)((?:\s+\w+)*)$/))) {
      const words = m[3].trim().split(/\s+/).filter(Boolean)
      if (words.length > 1 || (words.length === 1 && words[0] !== "lit"))
        fail(n, `a torch is off or lit at the start: write ${m[1]} torch @${m[2]} lit`)
      declare(n, m[1], { control: "flame", in: m[2], states: TORCH_STATES, lit: words.length === 1, n })
    } else if ((m = line.match(/^(\w+)\s+(toggle|activator)\s+@(\w+)((?:\s+\w+)*)$/))) {
      const control = m[2] as "toggle" | "activator"
      const names = m[4].trim().split(/\s+/).filter(Boolean)
      if (names.length !== 0 && names.length !== 2) fail(n, `a ${control} has two states, not ${names.length}`)
      const states = (names.length > 0 ? names : DEFAULT_STATES[control]) as readonly [string, string]
      if (states[0] === states[1]) fail(n, `${m[1]} names one state twice`)
      declare(n, m[1], { control, in: m[3], states, n })
    } else if ((m = line.match(/^(\w+)\s+fork\s+@(\w+)(.*)$/))) {
      if (m[3].trim() !== "") fail(n, `a fork's states are its ways; write ${m[1]} fork @${m[2]}`)
      declare(n, m[1], { control: "fork-switch", in: m[2], n })
    } else if ((m = line.match(/^(\w+)\s+sequence\s+((?:\w+\s+)+)reset\s+(\S+)$/))) {
      declare(n, m[1], { control: "sequence", steps: m[2].trim().split(/\s+/), resetAt: m[3], n })
    } else if ((m = line.match(/^(\w+)\s+plate\s+@(\w+)(\s+stone)?$/))) {
      if (placed(m[1])) fail(n, `${m[1]} is placed twice`)
      plates.set(m[1], { in: m[2], stone: m[3] !== undefined, n })
    } else if (/^\w+\s+stone\b/.test(line)) {
      fail(n, "a stone is written on the plate it rests on: p plate @hall stone")
    } else if ((m = line.match(/^(\w+)\s+([$*?-])$/))) {
      takes.push({ region: m[1], appetite: APPETITE[m[2]], n })
    } else if ((m = line.match(/^(\w+)\s+-\[([^\]]*)\]$/))) {
      const { list, owners, mode } = condition(n, m[2])
      const id = unique(`${m[1]}:barred`)
      gates[id] = { region: m[1], owners, ...(mode ? { mode } : {}) }
      terms[id] = { n, list }
    } else {
      const { regions: names, corridors } = readJoins(line, message => fail(n, message))
      corridors.forEach((items, i) => join(n, region(n, names[i]), region(n, names[i + 1]), items))
    }
  }

  for (const port of ["in", "out"]) if (!regions.has(port)) throw new Error(`the lock never reaches ${port}`)
  for (const { region: r, appetite, n } of takes) {
    if (!regions.has(r)) fail(n, `no corridor reaches ${r}`)
    regions.set(r, appetite)
  }

  const stones = [...plates.values()].filter(plate => plate.stone).length
  const opens = new Map<string, Record<string, string[]>>()
  const drafts = new Set<string>()
  const refused: string[] = []
  for (const [id, gate] of Object.entries(gates)) {
    const { n, list } = terms[id]
    if ("region" in gate) {
      if (!regions.has(gate.region)) fail(n, `no corridor reaches ${gate.region}`)
      if (gate.region === "in" || gate.region === "out") fail(n, `the region holding ${gate.region} cannot be barred`)
    }
    for (const { owner, state } of list) {
      if ((CARRY_TERMS as readonly string[]).includes(owner)) {
        if (stones === 0) fail(n, `${owner} asks about stones, and the lock has none`)
        continue
      }
      if (plates.has(owner)) {
        if ("region" in gate && plates.get(owner)!.in === gate.region)
          fail(n, `${owner} stands in ${gate.region}, which it would bar`)
        const side = state ?? "weighted"
        if (side !== "weighted" && side !== "empty") fail(n, `plate ${owner} has no state ${side}`)
        const table = plateOpens.get(owner) ?? { weighted: [], empty: [] }
        table[side as "weighted" | "empty"].push(id)
        plateOpens.set(owner, table)
        continue
      }
      const what = declared.get(owner)
      if (!what) {
        drafts.add(owner)
        continue
      }
      if ("region" in gate && "in" in what && what.in === gate.region)
        fail(n, `${owner} stands in ${gate.region}, which it would bar`)
      if (what.control === "fork-switch") {
        if (state) fail(n, `a fork's way is the gate itself: write -[${owner}]-`)
        const on = joins.find(j => j.barriers.includes(id))
        const first =
          on &&
          (on.between[0] === what.in ? on.barriers[0] === id : on.between[1] === what.in && on.barriers.at(-1) === id)
        if (!first) fail(n, `fork ${owner}'s gate must be the first thing on a join leaving ${what.in}`)
        continue
      }
      const named = state ?? (what.control === "sequence" ? "done" : what.states[1])
      const states = what.control === "sequence" ? ["done"] : what.states
      if (!states.includes(named)) fail(n, `${owner} has no state ${named}`)
      const table = opens.get(owner) ?? {}
      ;(table[named] ??= []).push(id)
      opens.set(owner, table)
    }
  }

  for (const [, plate] of plates) if (!regions.has(plate.in)) fail(plate.n, `no corridor reaches ${plate.in}`)
  for (const [id, gate] of Object.entries(gates)) {
    const pressed = gate.owners.filter(owner => plateOpens.get(owner)?.weighted.includes(id)).length
    const needed = gate.mode === "any" ? Math.min(pressed, 1) : pressed
    if (needed > stones) fail(terms[id].n, `${id} needs stones on ${needed} plates, the lock has ${stones}`)
  }
  const weights =
    plates.size > 0
      ? {
          plates: Object.fromEntries(
            [...plates].map(([id, plate]) => [
              id,
              { in: plate.in, stone: plate.stone, opens: plateOpens.get(id) ?? { weighted: [], empty: [] } },
            ])
          ),
        }
      : undefined

  const mechanics: Record<string, LockMechanic> = {}
  for (const [id, what] of declared) {
    for (const r of what.control === "sequence" ? what.steps : [what.in])
      if (!regions.has(r)) fail(what.n, `no corridor reaches ${r}`)
    if (!Object.values(gates).some(gate => gate.owners.includes(id))) refused.push(`line ${what.n}: ${id} owns no gate`)
    const table = opens.get(id) ?? {}
    if (what.control === "fork-switch") mechanics[id] = { control: "fork-switch", in: what.in }
    else if (what.control === "sequence") {
      const reset = gates[what.resetAt]
      if (!reset || "region" in reset) fail(what.n, `reset ${what.resetAt} names no gate between two regions`)
      mechanics[id] = {
        control: "sequence",
        steps: what.steps.map(step => ({ in: step })),
        resetAt: what.resetAt,
        opens: table,
      }
    } else if (what.control === "flame") {
      mechanics[id] = {
        control: "flame",
        in: what.in,
        starts: what.lit ? "on" : "off",
        opens: { off: table.off ?? [], on: table.on ?? [] },
      }
    } else {
      const [first, second] = what.states
      mechanics[id] = {
        control: what.control,
        in: what.in,
        starts: first,
        opens: { [first]: table[first] ?? [], [second]: table[second] ?? [] },
      }
    }
  }

  const connections: LockConnection[] = joins.map(j =>
    j.barriers.length > 0
      ? { between: j.between, barriers: j.barriers, ...(Object.keys(j.align).length > 0 ? { align: j.align } : {}) }
      : j.between
  )
  const lock: Lock = {
    name,
    regions: Object.fromEntries([...regions].map(([r, appetite]) => [r, { takes: appetite }])),
    connections,
    gates,
    ...(Object.keys(oneWays).length > 0 ? { oneWays } : {}),
    mechanics,
    ...(weights ? { weights } : {}),
    in: "in",
    out: "out",
    ...(spots.length > 0 ? { nestSpot: { from: spots[0].from, to: spots[0].to } } : {}),
  }
  // A door folds only the owners some position names, so a gate no arrangement opens would let its
  // other owners open it alone in play, while the walk keeps it shut.
  if (weights) {
    const { opens: opened } = stoneArrangements(lock)
    for (const [id, gate] of Object.entries(gates))
      if (gate.owners.some(owner => isWeightOwner(lock, owner)) && !Object.values(opened).some(o => o.includes(id)))
        fail(terms[id].n, `gate ${id}: its stones never open it`)
  }
  for (const fault of unladenFaults(lock))
    refused.push(
      `line ${terms[fault.barrier].n}: ${fault.type === "unladenOnDrop" ? "a drop already takes empty hands" : "unladen stands alone, as a narrow passage"}`
    )
  // A LOCK HAS ONE NEST SPOT: only the text can say two, so only the parse refuses it.
  for (const extra of spots.slice(1))
    refused.push(
      `line ${extra.n}: nestSpotsRepeated: a lock has one nest spot, and ${spots[0].from} -&> ${spots[0].to} is one already`
    )
  // The spot is the corridor another lock is spliced into, so its pair carries no second connection.
  const kept = spots[0]
  if (kept && joins.filter(j => [kept.from, kept.to].every(r => j.between.includes(r))).length > 1)
    refused.push(
      `line ${kept.n}: nestSpotShared: ${kept.from} and ${kept.to} have another connection, and a nest spot is a corridor of its own`
    )
  return { lock, drafts: [...drafts], refused }
}
