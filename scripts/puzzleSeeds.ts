#!/usr/bin/env tsx
/**
 * Finds and verifies the seeds src/data/puzzleSeeds.ts ships — boards proven offline to build on
 * their first attempt, so play time skips the search. See docs/offline-puzzle-seeds.md.
 *
 * Run: yarn generate-seeds [--family=<id>] [--cap=<n>] [--tries=<n>]
 *      yarn seeds-info
 *
 *   --family  only this family (repeatable as a comma-separated list)
 *   --cap     most seeds to keep per bucket, so one hot configuration cannot dominate the artifact
 *   --tries   most seeds to test per bucket before reporting the bucket short
 */
import { writeFileSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"
import { generatedWorldConfigs } from "../src/data/generatedWorld"
import { puzzleSeeds } from "../src/data/puzzleSeeds"
import type { Grade } from "../src/game/families/familyMeta"
import { enumerateConfigs, type ConfigDemand } from "../src/game/seeds/enumerateConfigs"
import { ALL_FAMILY_META } from "../src/mods/allFamilyMeta"

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../src/data/puzzleSeeds.ts")

const argv = process.argv.slice(2)
const command = argv.find(arg => !arg.startsWith("--")) ?? "info"
const flag = (name: string) => argv.find(arg => arg.startsWith(`--${name}=`))?.split("=")[1]
const number = (name: string, fallback: number) => Number(flag(name) ?? fallback)

const CAP = number("cap", 200)
const TRIES = number("tries", 50_000)
const only = flag("family")?.split(",")

const byId = new Map(ALL_FAMILY_META.map(family => [family.id, family]))
const demands = enumerateConfigs(generatedWorldConfigs, ALL_FAMILY_META).filter(
  demand => !only || only.includes(demand.familyId)
)

/**
 * Walks seeds until the bucket is full. A seed is admitted only if it builds a board the generator
 * would have kept on its **first** attempt — which is what lets play time run one attempt with no
 * gates at all, and is why `grade` has to be the generator's own predicate rather than a second
 * opinion about it.
 */
const fill = (demand: ConfigDemand, target: number) => {
  const seedable = byId.get(demand.familyId)?.seedable
  if (!seedable) throw new Error(`family ${demand.familyId} is not seedable`)
  const options = seedable.resolveOptions({ difficulty: demand.difficulty })
  const seeds: number[] = []
  const grades: Grade[] = []
  let tried = 0
  for (let seed = 1; seeds.length < target && tried < TRIES; seed++, tried++) {
    let board
    try {
      board = seedable.generate(seed, options, 1)
    } catch {
      continue // the one attempt it was given missed, so no list may carry this seed
    }
    const grade = seedable.grade(board, options)
    if (!grade) continue // built, but not a board this generator would have kept
    seeds.push(seed)
    grades.push(grade)
  }
  return { seeds, grades, tried }
}

const describe = (demand: ConfigDemand, target: number) =>
  `${demand.familyId}/${demand.difficulty} (${demand.rooms} rooms, want ${target})`

const summarise = (grades: Grade[]) => {
  if (!grades.length) return ""
  const steps = grades.map(grade => grade.steps).sort((left, right) => left - right)
  const deepest = [...new Set(grades.map(grade => grade.deepest).filter(Boolean))]
  return `steps ${steps[0]}-${steps[steps.length - 1]} (median ${steps[steps.length >> 1]}), demands ${deepest.join("/") || "nothing"}`
}

if (command === "generate") {
  const lists: Record<string, number[]> = { ...puzzleSeeds }
  let short = 0
  for (const demand of demands) {
    const target = Math.min(demand.rooms, CAP)
    const started = performance.now()
    const { seeds, grades, tried } = fill(demand, target)
    lists[demand.hash] = seeds
    const took = ((performance.now() - started) / 1000).toFixed(1)
    // Never let a bucket come up short quietly: a half-filled list reads as covered until a player
    // meets the room that repeats.
    if (seeds.length < target) short++
    const verdict =
      seeds.length < target ? `SHORT ${seeds.length}/${target} after ${tried} tries` : `${seeds.length} seeds`
    console.log(`${describe(demand, target).padEnd(46)} ${verdict.padEnd(28)} ${took}s  ${summarise(grades)}`)
  }

  const sorted = Object.keys(lists)
    .sort((left, right) => Number(left) - Number(right))
    .reduce<Record<string, number[]>>((all, key) => ({ ...all, [key]: lists[key] }), {})
  writeFileSync(
    OUT,
    `// THIS FILE IS AUTO-GENERATED. DO NOT EDIT MANUALLY.
// Run: yarn generate-seeds
//
// Seeds proven to build a graded board on their first attempt, filed by the hash of the options they
// were proven under (docs/offline-puzzle-seeds.md). Parsed from one string rather than written as an
// object literal, which is cheaper for the engine to read.
export const puzzleSeeds: Record<string, number[]> = JSON.parse(
  ${JSON.stringify(JSON.stringify(sorted))}
)
`
  )
  console.log(`\n${Object.keys(sorted).length} buckets written to src/data/puzzleSeeds.ts`)
  if (short) {
    console.error(`${short} bucket(s) came up short — raise --tries, or the tier's dials are too tight to fill.`)
    process.exit(1)
  }
} else {
  const listed = demands.filter(demand => puzzleSeeds[demand.hash]?.length)
  for (const demand of demands)
    console.log(
      `${describe(demand, Math.min(demand.rooms, CAP)).padEnd(46)} ${String(puzzleSeeds[demand.hash]?.length ?? 0).padStart(4)} listed`
    )
  console.log(
    `\n${listed.length}/${demands.length} buckets listed, over ${demands.reduce((sum, d) => sum + d.rooms, 0)} rooms`
  )
}
