// A LOCK WRITTEN AS TEXT, one line per corridor, so a sketch can be typed rather than drawn. The
// notation is LOCK_SYNTAX, which `yarn lock` also prints so nobody has to remember it.
import { chain, embed } from "./lockSketch"
import type { AuthoredLock, LockSwitch } from "./lockSketch"
import type { RegionAppetite } from "./regions"

export const LOCK_SYNTAX = `
  in -- out                     plain corridor; in and out are the way in and the way out
  in -[S1]- hall                gate: open once lever S1 is thrown
  in -[!S1]- hall               gate: open while lever S1 is at rest, shut once thrown
  in -[Y]- hall                 gate: open while board Y is solved this way
  hall >> in                    one-way drop
  in -[Y]- hall >> cell         a line may go on: one connection after another
  -[A+B]-  -[A|B]-  -[#red]-    both owners, either owner, a floor key
  Y board @in                   a board stands in in; its ways are the gates naming it
  S1 lever @s1                  a lever stands in s1, starting at rest
  #red @cell                    a key lies in cell
  s2 $        hall *            takes a reward, takes puzzles (in takes puzzles, the rest nothing)
  // comment
  chain twoLamps doubleBack     alone in a file: locks one after another
  embed doubleBack.s2 = seesaw  alone in a file: seesaw stands in doubleBack's s2
`.slice(1)

const EDGE = /\s*(--|>>|-\[[^\]]*\]-)\s*/
const NAME = /^\w+$/

export const parseLock = (text: string, library: Record<string, AuthoredLock> = {}): AuthoredLock => {
  const lines = text
    .split("\n")
    .map((raw, i) => ({ n: i + 1, line: raw.replace(/\/\/.*/, "").trim() }))
    .filter(({ line }) => line !== "")
  const fail = (n: number, message: string): never => {
    throw new Error(`line ${n}: ${message}`)
  }
  const named = (n: number, name: string) => library[name] ?? fail(n, `no lock called ${name}`)

  const composed = lines[0]?.line.match(/^(chain|embed)\s+(.*)$/)
  if (composed) {
    const { n } = lines[0]
    if (lines.length > 1) fail(lines[1].n, `a ${composed[1]} line stands alone`)
    if (composed[1] === "chain") {
      const names = composed[2].split(/\s+/)
      // A lock chained twice needs two prefixes.
      const prefix = (name: string, i: number) =>
        names.filter(other => other === name).length > 1 ? `${name}${i + 1}` : name
      return chain(Object.fromEntries(names.map((name, i) => [prefix(name, i), named(n, name)])))
    }
    const embedding = composed[2].match(/^(\w+)\.(\w+)\s*=\s*(\w+)$/) ?? fail(n, "write embed host.region = guest")
    const [, hostName, region, guestName] = embedding
    const host = named(n, hostName)
    if (!host.regions[region]) fail(n, `${hostName} has no region ${region}`)
    return embed(host, region, guestName, named(n, guestName))
  }

  const regions = new Map<string, RegionAppetite>()
  const gates: AuthoredLock["gates"] = {}
  const connections: [string, string][] = []
  const oneWays: { from: string; to: string }[] = []
  const placed = new Map<string, { kind: "board" | "lever" | "key"; in: string; n: number }>()
  const used = new Map<string, { n: number; rest: string[]; thrown: string[] }>()
  const takes: { region: string; appetite: RegionAppetite; n: number }[] = []

  const region = (n: number, name: string) => {
    if (!NAME.test(name)) fail(n, `cannot read a region called "${name}"`)
    if (!regions.has(name)) regions.set(name, name === "in" ? "puzzles" : "nothing")
    return name
  }
  const gate = (n: number, from: string, to: string, owners: string) => {
    if (owners.includes("+") && owners.includes("|")) fail(n, `-[${owners}]- mixes + and |`)
    let id = `${from}-${to}`
    for (let k = 2; gates[id]; k++) id = `${from}-${to}#${k}`
    const terms = owners
      .split(/[+|]/)
      .map(term => term.trim().match(/^(!?)(#?\w+)$/) ?? fail(n, `cannot read owner "${term}"`))
    const owned = terms.map(([, , owner]) => owner)
    const twice = owned.find((owner, i) => owned.indexOf(owner) !== i)
    if (twice) fail(n, `-[${owners}]- names ${twice} twice`)
    for (const [, rest, owner] of terms) {
      if (rest && owner.startsWith("#")) fail(n, `a key has no rest side: !${owner}`)
      const use = used.get(owner) ?? { n, rest: [], thrown: [] }
      ;(rest ? use.rest : use.thrown).push(id)
      used.set(owner, use)
    }
    gates[id] = {
      from,
      to,
      owners: terms.map(([, , owner]) => owner),
      ...(owners.includes("|") ? { mode: "any" } : {}),
    }
  }

  for (const { n, line } of lines) {
    const mechanism = line.match(/^(\w+)\s+(board|lever)\s+@(\w+)$/) ?? line.match(/^(#\w+)\s+()@(\w+)$/)
    if (mechanism) {
      const [, id, kind, at] = mechanism
      if (placed.has(id)) fail(n, `${id} is placed twice`)
      placed.set(id, { kind: (kind || "key") as "board" | "lever" | "key", in: at, n })
      continue
    }
    const appetite = line.match(/^(\w+)\s+([$*])$/)
    if (appetite) {
      takes.push({ region: appetite[1], appetite: appetite[2] === "$" ? "reward" : "puzzles", n })
      continue
    }
    const parts = line.split(EDGE)
    if (parts.length < 3) fail(n, `cannot read "${line}"`)
    for (let i = 1; i < parts.length; i += 2) {
      const [from, to] = [region(n, parts[i - 1]), region(n, parts[i + 1])]
      const edge = parts[i]
      if (edge === "--") connections.push([from, to])
      else if (edge === ">>") oneWays.push({ from, to })
      else gate(n, from, to, edge.slice(2, -2))
    }
  }

  for (const { region: name, appetite, n } of takes) {
    if (!regions.has(name)) fail(n, `no corridor reaches ${name}`)
    regions.set(name, appetite)
  }
  const switches: Record<string, LockSwitch> = {}
  const keys: Record<string, { in: string }> = {}
  for (const [id, { n }] of used) if (!placed.has(id)) fail(n, `${id} owns a gate but is never placed`)
  for (const [id, { kind, in: at, n }] of placed) {
    if (!regions.has(at)) fail(n, `no corridor reaches ${at}`)
    const use = used.get(id) ?? fail(n, `${id} owns no gate`)
    if (kind === "key") keys[id] = { in: at }
    else if (kind === "board") {
      if (use.rest.length > 0) fail(use.n, `board ${id} has no rest side: !${id}`)
      switches[id] = { in: at, encounter: "lightbeamSwitch" }
    } else switches[id] = { in: at, encounter: "handle", left: use.rest, right: use.thrown, starts: "left" }
  }
  for (const port of ["in", "out"]) if (!regions.has(port)) throw new Error(`the lock never reaches ${port}`)

  return {
    regions: Object.fromEntries([...regions].map(([name, appetite]) => [name, { takes: appetite }])),
    gates,
    switches,
    ...(Object.keys(keys).length > 0 ? { keys } : {}),
    ...(connections.length > 0 ? { connections } : {}),
    ...(oneWays.length > 0 ? { oneWays } : {}),
    in: "in",
    out: "out",
  }
}
