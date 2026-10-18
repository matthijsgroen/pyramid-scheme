// What `yarn lock <file>.web` prints: the checks, then where every pot's stops, door and activator landed, then the
// cheapest routes (docs/instructions/sand-pyramid.md, "What yarn lock <web> reports").
import type { ResolvedWeb, WebRefusal, WebRefusalType } from "./webLine"
import { describeWhere, pyramidName } from "./webLine"
import type { CheapestRoute, WebWalk } from "./webWalk"
import { bindingFace, laidLockRefusals } from "./webWalk"

const GROUPS: { ok: string; types: WebRefusalType[] }[] = [
  {
    ok: "every place is in the world",
    types: [
      "placeNotInWorld",
      "activatorTwice",
      "unknownActivator",
      "activatorUnused",
      "placeTaken",
      "activatorBehindWard",
      "webTooLarge",
    ],
  },
  {
    ok: "every stop lands on a seam of its own",
    types: ["stopsMalformed", "stopNotAfterFrom", "stopsShareSeam", "stopOffGround", "potsOverlap", "frontOnAnyGate"],
  },
  {
    ok: "every input is bound, and every binding names an input",
    types: ["inputUnbound", "bindingNamesNoInput", "outsideTooMany", "lockRefused"],
  },
  { ok: "no front leaks", types: ["frontLeaks"] },
  { ok: "no lever under its own front", types: ["ownFront"] },
  { ok: "no deadlock", types: ["deadlock"] },
  { ok: "no floor waits on a key held only behind it", types: ["waitsBehind"] },
]

const refusalLine = (refusal: WebRefusal) =>
  `✗ ${refusal.type}${refusal.n !== undefined ? ` (line ${refusal.n})` : ""}: ${refusal.message}`

const routeLines = (label: string, route: CheapestRoute): string[] =>
  route === "tooLarge"
    ? [`${label}: too many states to count`]
    : route === "none"
      ? [`${label}: no route finishes every journey`]
      : [
          `${label}: ${route.visits} visits, ${route.returns === 0 ? "no return" : `${route.returns} return${route.returns === 1 ? "" : "s"}`}`,
          `  ${route.route.join(" ▸ ")}`,
        ]

/** The report of a web read against a world, and whether it passes. `floors` is the re-entry walk of the web
 * journeys' floors, where the floors were carved. */
export const webReport = (
  resolved: ResolvedWeb,
  walked: WebWalk | undefined,
  floors?: { walked: number; failures: string[] }
): { text: string; sound: boolean } => {
  const refusals = [...resolved.refusals, ...laidLockRefusals(resolved), ...(walked?.refusals ?? [])]
  const journeys = Object.values(resolved.world.journeys).map(list => list.length)
  const lines = [`## ${resolved.web.name}`, "", "✓ reads"]
  for (const group of GROUPS) {
    const found = refusals.filter(r => group.types.includes(r.type))
    if (found.length > 0) lines.push(...found.map(refusalLine))
    else if (walked || GROUPS.indexOf(group) < 3)
      lines.push(
        `✓ ${group.ok}${group.ok === "every place is in the world" ? `: journeys read as ${journeys.join(", ")} pyramids` : ""}`
      )
  }
  const count = resolved.activators.length
  if (walked && walked.closure.finished && walked.closure.activators.length === count)
    lines.push(
      `✓ every pull order finishes: ${count} activators, ${walked.sets} reachable pull sets, each closes on all ${count}`
    )
  if (walked && walked.warnings.length === 0) lines.push("✓ every buried place is seen before its lever is pulled")
  if (walked) lines.push(...walked.warnings)
  if (floors)
    lines.push(
      ...(floors.failures.length === 0
        ? [`✓ every floor of a web journey walks sound with re-entry: ${floors.walked} with a lock`]
        : floors.failures.map(failure => `✗ with re-entry, ${failure}`))
    )
  if (walked && walked.assumed.length > 0) lines.push(`assumed held on the way: ${walked.assumed.join(", ")}`)

  lines.push("")
  for (const pot of resolved.pots) {
    lines.push(`pot ${pot.name}   ${pot.span}, ${pot.rooms} rooms   by ${pot.levers.join(" ")}`)
    pot.doors.forEach((door, k) => {
      const label =
        k === 0
          ? pot.from !== undefined
            ? `from ${pot.from}%`
            : "from the arrival"
          : `after ${k} → ${Math.round(pot.stops[k - 1])}%`
      lines.push(`  ${label.padEnd(16)} ${describeWhere(door.at, door.where)}`)
    })
    lines.push(`  ${`after ${pot.levers.length}`.padEnd(16)} open`)
  }
  const named = [...resolved.doors.filter(d => !resolved.pots.some(p => p.doors.includes(d)))].map(
    d => `  ${d.source}   → ${describeWhere(d.at, d.where)}`
  )
  const bound = resolved.bindings.map(b => `  ${b.lock}.${b.input} by ${b.key.slice(4)}   → ${bindingFace(b)}`)
  if (named.length + bound.length > 0) lines.push("named", ...named, ...bound)
  if (resolved.activators.length > 0)
    lines.push(
      "activators",
      ...resolved.activators.map(a => `  ${a.name.padEnd(8)} ${a.look.padEnd(5)} ${pyramidName(a.at)} ${a.place}`)
    )
  if (walked)
    lines.push(
      "",
      ...routeLines("cheapest", walked.cheapest),
      ...routeLines("cheapest seeing every sand first", walked.cheapestSeeing)
    )
  const sound = refusals.length === 0 && (!floors || floors.failures.length === 0) && walked !== undefined
  return { text: lines.join("\n") + "\n", sound }
}
