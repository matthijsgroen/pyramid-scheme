#!/usr/bin/env tsx
/**
 * Draws a lock written in lockText.ts's notation, walks it, says what it could do without, and prints
 * the JSON the notation compiles to. Chain and embed lines resolve against the catalogue.
 *
 *   yarn lock                       every lock in the catalogue
 *   yarn lock doubleBack            one of them, with its JSON
 *   yarn lock sketch.lock           a file
 *   yarn lock sketch.lock --watch   the same, redrawn on every save; a new file starts with the notation
 *   yarn lock - < sketch.lock       standard input
 *   yarn lock --help                the notation
 */
import { existsSync, readFileSync, watch, writeFileSync } from "node:fs"
import { basename, dirname } from "node:path"
import { describeLockWalkFailure, walkLock } from "../src/game/lockWalk"
import { drawLock, lockQuality, solveLock, topologyLock, unreachedRegions } from "../src/game/lockSketch"
import type { AuthoredLock } from "../src/game/lockSketch"
import { LOCK_SYNTAX, parseLock } from "../src/game/lockText"
import { LOCK_CATALOGUE } from "../src/game/lockCatalogue"

const args = process.argv.slice(2)
const watching = args.includes("--watch")
const target = args.find(arg => !arg.startsWith("--"))
const library: Record<string, AuthoredLock> = LOCK_CATALOGUE

const report = (name: string, lock: AuthoredLock, withJson: boolean): boolean => {
  const spec = topologyLock(lock)
  const walked = walkLock(spec)
  const unreached = unreachedRegions(spec)
  const reachable = Array.isArray(unreached) && unreached.length === 0
  const deadEnd = !walked.sound && walked.failure.type === "strands"
  const unplaced = Object.keys(lock.unplaced ?? {})
  const checks = [
    ...(unplaced.length > 0 ? [`✗ not placed yet: ${unplaced.join(", ")}`] : []),
    reachable
      ? "✓ every region is reachable"
      : `✗ ${unreached === "tooLarge" ? "too many states to walk" : `never reached: ${unreached.join(", ")}`}`,
    walked.sound || deadEnd ? "✓ solvable" : `✗ not solvable: ${describeLockWalkFailure(walked.failure)}`,
    ...(deadEnd ? [`✗ a dead end: ${describeLockWalkFailure(walked.failure)}`] : []),
  ]
  const lines = [`## ${name}`, "", ...checks, "", drawLock(spec)]
  const solved = solveLock(spec)
  if (solved) lines.push("", `cheapest: ${solved.actions} actions — ${solved.steps.join(" ▸ ")}`)
  const notes = lockQuality(lock)
  lines.push(
    "",
    ...(notes.length > 0 ? notes.map(note => `! ${note}`) : walked.sound ? ["every piece bears load"] : [])
  )
  // Short objects and lists stay on one line, so the JSON reads at a glance.
  const json = JSON.stringify(lock, null, 2).replace(/[{[][^{}[\]]*[}\]]/g, part =>
    part.length < 100 ? part.replace(/\s*\n\s*/g, " ") : part
  )
  if (withJson) lines.push("", json)
  console.log(lines.join("\n") + "\n")
  return unplaced.length === 0 && reachable && walked.sound
}

const syntax = `${LOCK_SYNTAX}\n  locks to chain or embed: ${Object.keys(library).join(", ")}\n`

const fromText = (name: string, text: string): boolean => {
  try {
    // Watching is for designing; the JSON is for when the design is done.
    return report(name, parseLock(text, library), !watching)
  } catch (error) {
    // A watched file carries the syntax in its own comments.
    console.log(`## ${name}\n\n✗ ${(error as Error).message}\n${watching ? "" : `\n${syntax}`}`)
    return false
  }
}

// A new file to design in starts with the syntax as comments, so it never has to be remembered.
if (watching && target && target !== "-" && !(target in library) && !existsSync(target)) {
  const help = syntax.split("\n").map(line => `//${line}`.trimEnd())
  writeFileSync(
    target,
    ["// A new lock. Save to redraw; lines starting with // are ignored.", "//", ...help, "", "in -- out", ""].join(
      "\n"
    )
  )
}

if (args.includes("--help")) {
  console.log(syntax)
} else if (!target) {
  const sound = Object.entries(LOCK_CATALOGUE).map(([name, lock]) => report(name, lock, false))
  process.exitCode = sound.every(Boolean) ? 0 : 1
} else if (target === "-") {
  process.exitCode = fromText("stdin", readFileSync(0, "utf8")) ? 0 : 1
} else if (existsSync(target)) {
  const run = () => {
    // An editor saving by rename leaves a moment with no file; the save that follows redraws.
    if (!existsSync(target)) return false
    // Screen, scrollback, cursor home: console.clear() leaves the previous draw in the scrollback.
    if (watching) process.stdout.write("\x1b[2J\x1b[3J\x1b[H")
    const sound = fromText(basename(target), readFileSync(target, "utf8"))
    if (watching) console.log(`watching ${target} — save to redraw, ctrl-c to stop`)
    return sound
  }
  process.exitCode = run() ? 0 : 1
  // The folder is watched, not the file: a save by rename replaces the file a file watch was holding.
  // ponytail: editors save in bursts (truncate, write, rename); a short debounce draws once per save.
  let pending: NodeJS.Timeout | undefined
  if (watching)
    watch(dirname(target), (_, file) => {
      if (file !== basename(target)) return
      clearTimeout(pending)
      pending = setTimeout(run, 50)
    })
} else if (target in library) {
  process.exitCode = report(target, library[target], true) ? 0 : 1
} else {
  console.error(`no file or catalogue lock called ${target}; the catalogue has ${Object.keys(library).join(", ")}`)
  process.exitCode = 1
}
