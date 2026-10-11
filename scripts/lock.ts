#!/usr/bin/env tsx
/**
 * Draws a lock written in lockNotation.ts's notation, walks it, says what it could do without, and
 * prints the shared Lock JSON it reads into.
 *
 *   yarn lock                       the catalogue as one table: mechanisms, shortest solution, checks
 *   yarn lock doubleBack            one of them, with its JSON (also `expert/doubleBack`)
 *   yarn lock lessons/torch --watch src/game/locks/junior/lessons/torch.lock, redrawn on every save
 *   yarn lock sketch.lock           a file
 *   yarn lock sketch.lock --watch   redrawn on every save; a new file starts with the notation
 *   yarn lock - < sketch.lock       standard input
 *   yarn lock --help                the notation
 */
import { existsSync, readFileSync, watch, writeFileSync } from "node:fs"
import { basename, dirname } from "node:path"
import { drawLock } from "../src/game/lockDraw"
import { lockQuality, solveLock } from "../src/game/lockReview"
import { LOCK_SYNTAX, parseLock } from "../src/game/lockNotation"
import type { ParsedLock } from "../src/game/lockNotation"
import { LESSONS, LOCK_CATALOGUE, LOCK_ENTRIES, LOCK_TIERS, findLockEntry } from "../src/game/lockCatalogue"
import { corridorLines, formatLockTable, isLessonPath, lockChecks, lockRow } from "./lockTable"

const args = process.argv.slice(2)
const watching = args.includes("--watch")
const named = args.find(arg => !arg.startsWith("--"))
const library: Record<string, ParsedLock> = { ...LOCK_CATALOGUE, ...LESSONS }
// A name without `.lock` is a catalogue lock by any name it answers to; watching a new one starts it in its tier
// folder (`expert/sketch`), or under junior without one.
const isName = named && named !== "-" && !named.endsWith(".lock")
const entry = isName ? findLockEntry(named) : undefined
const inLocks = isName
  ? entry
    ? `src/game/locks/${entry.tier}/${entry.path}.lock`
    : `src/game/locks/${LOCK_TIERS.some(tier => named.startsWith(`${tier}/`)) ? "" : "junior/"}${named}.lock`
  : undefined
const target = inLocks && (existsSync(inLocks) || (watching && !entry)) ? inLocks : named

const report = (name: string, parsed: ParsedLock, withJson: boolean, lesson: boolean): boolean => {
  const { lock, drafts } = parsed
  const { spec, walked, checks, sound } = lockChecks(parsed, { lesson })
  const lines = [`## ${name}`, "", ...checks, "", drawLock(lock, drafts)]
  const corridors = corridorLines(lock)
  if (corridors.length > 0) lines.push("", "corridors:", ...corridors.map(line => `  ${line}`))
  const solved = solveLock(spec)
  if (solved) lines.push("", `cheapest: ${solved.actions} actions — ${solved.steps.join(" ▸ ")}`)
  const notes = lockQuality(lock, drafts)
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
  return sound
}

const syntax = `${LOCK_SYNTAX}\n  catalogue: ${Object.keys(library).join(", ")}\n`

const fromText = (name: string, text: string, lesson = false): boolean => {
  try {
    // Watching is for designing; the JSON is for when the design is done.
    return report(name, parseLock(text, name.replace(/\.lock$/, "")), !watching, lesson)
  } catch (error) {
    // A watched file carries the syntax in its own comments.
    console.log(`## ${name}\n\n✗ ${(error as Error).message}\n${watching ? "" : `\n${syntax}`}`)
    return false
  }
}

// A new file to design in starts with the syntax as comments, so it never has to be remembered.
if (watching && target && target !== "-" && !entry && !existsSync(target)) {
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
  const rows = LOCK_ENTRIES.map(e => lockRow(`${e.tier}/${e.path}`, (e.lesson ? LESSONS : LOCK_CATALOGUE)[e.name]))
  console.log(formatLockTable(rows))
  process.exitCode = rows.every(row => row.sound) ? 0 : 1
} else if (target === "-") {
  process.exitCode = fromText("stdin", readFileSync(0, "utf8")) ? 0 : 1
} else if (existsSync(target)) {
  const run = () => {
    // An editor saving by rename leaves a moment with no file; the save that follows redraws.
    if (!existsSync(target)) return false
    // Screen, scrollback, cursor home: console.clear() leaves the previous draw in the scrollback.
    if (watching) process.stdout.write("\x1b[2J\x1b[3J\x1b[H")
    const sound = fromText(basename(target), readFileSync(target, "utf8"), isLessonPath(target))
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
} else if (entry) {
  process.exitCode = report(entry.name, library[entry.name], true, entry.lesson) ? 0 : 1
} else {
  console.error(`no file or catalogue lock called ${target}; the catalogue has ${Object.keys(library).join(", ")}`)
  process.exitCode = 1
}
