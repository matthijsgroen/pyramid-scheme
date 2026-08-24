#!/usr/bin/env tsx
/**
 * Finds and verifies the seeds src/data/puzzleSeeds.ts ships — boards proven offline to build on
 * their first attempt, so play time skips the search. See docs/instructions/puzzle-screens.md §6.1.
 *
 * Run: yarn generate-seeds [--family=<id>] [--cap=<n>] [--tries=<n>] [--parallel=<n>]
 *      yarn seeds-info
 *
 *   --family    only these families (comma-separated); other buckets keep the seeds they have
 *   --cap       most seeds to keep per bucket, so one hot configuration cannot dominate the artifact
 *               (a bucket otherwise aims at SURPLUS × the rooms that draw from it, never at exactly them)
 *   --tries     most seeds to test per bucket before reporting the bucket short
 *   --parallel  worker threads; defaults to two fewer than the machine has cores
 */
import { cpus } from "node:os"
import { writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { Worker } from "node:worker_threads"
import { generatedWorldConfigs } from "../src/data/generatedWorld"
import { puzzleSeeds } from "../src/data/puzzleSeeds"
import type { Grade } from "../src/game/families/familyMeta"
import type { FoundSeed } from "../src/game/seeds/findSeeds"
import { enumerateConfigs, seedTarget, SEED_CAP, type ConfigDemand } from "../src/game/seeds/enumerateConfigs"
import { ALL_FAMILY_META } from "../src/mods/allFamilyMeta"
import type { SeedTask, SeedWorkerMessage } from "./seedProtocol"

const here = dirname(fileURLToPath(import.meta.url))
const OUT = join(here, "../src/data/puzzleSeeds.ts")

const argv = process.argv.slice(2)
const command = argv.find(arg => !arg.startsWith("--")) ?? "info"
const flag = (name: string) => argv.find(arg => arg.startsWith(`--${name}=`))?.split("=")[1]
const number = (name: string, fallback: number) => Number(flag(name) ?? fallback)

const CAP = number("cap", SEED_CAP)
// Only ever spent by a bucket that cannot fill — every other one stops the moment it hits its
// target, so the budget costs wall time only where the tier's dials are genuinely tight.
const TRIES = number("tries", 200_000)
// Two cores left alone, so the machine running this stays usable.
const THREADS = Math.max(1, Math.min(number("parallel", cpus().length - 2), cpus().length - 1))
// Windows of roughly a second at the slowest bucket's yield. Small enough that no thread is left
// holding the last long task while the others idle, large enough that the messaging is noise.
const CHUNK = 500
const only = flag("family")?.split(",")

const demands = enumerateConfigs(generatedWorldConfigs, ALL_FAMILY_META).filter(
  demand => !only || only.includes(demand.familyId)
)
const targetFor = (demand: ConfigDemand) => seedTarget(demand, CAP)
const describe = (demand: ConfigDemand) => `${demand.familyId}/${demand.difficulty} (${demand.rooms} rooms)`

const summarise = (grades: Grade[]) => {
  if (!grades.length) return ""
  const steps = grades.map(grade => grade.steps).sort((left, right) => left - right)
  const deepest = [...new Set(grades.map(grade => grade.deepest).filter(Boolean))]
  return `steps ${steps[0]}-${steps[steps.length - 1]} (median ${steps[steps.length >> 1]}), demands ${deepest.join("/") || "nothing"}`
}

/** What one bucket has collected so far, kept per window so the order threads finish in cannot matter. */
type Bucket = { demand: ConfigDemand; target: number; byChunk: Map<number, FoundSeed[]>; done: boolean }

/**
 * The windows a bucket has retired, concatenated in order — everything up to the first window still
 * outstanding. A bucket is satisfied once that prefix holds its target, which makes the result a
 * function of the seed space alone rather than of which thread got there first.
 */
const retired = (bucket: Bucket): FoundSeed[] => {
  const found: FoundSeed[] = []
  for (let chunk = 0; bucket.byChunk.has(chunk); chunk++) found.push(...bucket.byChunk.get(chunk)!)
  return found
}

const runPool = async (buckets: Bucket[]) => {
  const tasks: SeedTask[] = []
  for (const bucket of buckets)
    for (let chunk = 0; chunk * CHUNK < TRIES; chunk++)
      tasks.push({
        taskId: tasks.length,
        hash: bucket.demand.hash,
        familyId: bucket.demand.familyId,
        difficulty: bucket.demand.difficulty,
        chunk,
        from: 1 + chunk * CHUNK,
        count: CHUNK,
      })

  const byHash = new Map(buckets.map(bucket => [bucket.demand.hash, bucket]))
  const pending = new Map<number, SeedTask>()
  let next = 0
  let completed = 0
  const errors: string[] = []

  // The worker is TypeScript, which a worker thread will not load on its own. Booting it through a
  // shim that registers the tsx loader first is what replaces a bundling step and a build artifact.
  const entry = JSON.stringify(new URL("./seedWorker.ts", import.meta.url).href)
  const boot = `import("tsx/esm/api").then(tsx => { tsx.register(); return import(${entry}) })`

  await new Promise<void>((resolve, reject) => {
    const workers = Array.from({ length: Math.min(THREADS, tasks.length) }, () => new Worker(boot, { eval: true }))
    let alive = workers.length

    const handOut = (worker: Worker) => {
      // Skip past anything whose bucket already has what it needs — most of the queue, since every
      // bucket is queued for the full try budget and most fill long before spending it.
      while (next < tasks.length && byHash.get(tasks[next].hash)!.done) next++
      if (next >= tasks.length) {
        worker.postMessage({ type: "shutdown" })
        return
      }
      const task = tasks[next++]
      pending.set(task.taskId, task)
      worker.postMessage({ type: "task", task })
    }

    for (const worker of workers) {
      worker.on("message", (message: SeedWorkerMessage) => {
        if (message.type === "idle") return handOut(worker)
        const task = pending.get(message.taskId)!
        pending.delete(message.taskId)
        if (message.error) errors.push(`${task.familyId}/${task.difficulty}: ${message.error}`)
        const bucket = byHash.get(task.hash)!
        bucket.byChunk.set(task.chunk, message.found)
        if (retired(bucket).length >= bucket.target) bucket.done = true
        completed++
        if (completed % 40 === 0)
          process.stderr.write(
            `\r${buckets.filter(b => b.done).length}/${buckets.length} buckets, ${completed} windows scanned`
          )
      })
      worker.on("error", reject)
      worker.on("exit", () => {
        if (--alive === 0) resolve()
      })
    }
  })

  process.stderr.write("\r".padEnd(70) + "\r")
  for (const error of errors) console.error(error)
  return errors.length
}

if (command === "generate") {
  const buckets: Bucket[] = demands.map(demand => ({
    demand,
    target: targetFor(demand),
    byChunk: new Map(),
    done: false,
  }))
  const started = performance.now()
  const failures = await runPool(buckets)

  const lists: Record<string, number[]> = { ...puzzleSeeds }
  let short = 0
  for (const bucket of buckets) {
    const found = retired(bucket).slice(0, bucket.target)
    lists[bucket.demand.hash] = found.map(entry => entry.seed)
    // Never let a bucket come up short quietly: a half-filled list reads as covered until a player
    // meets the room that repeats.
    if (found.length < bucket.target) short++
    const verdict = found.length < bucket.target ? `SHORT ${found.length}/${bucket.target}` : `${found.length} seeds`
    console.log(`${describe(bucket.demand).padEnd(42)} ${verdict.padEnd(18)} ${summarise(found.map(f => f.grade))}`)
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
// were proven under (docs/instructions/puzzle-screens.md §6.1). Parsed from one string rather than written as an
// object literal, which is cheaper for the engine to read.
export const puzzleSeeds: Record<string, number[]> = JSON.parse(
  '${JSON.stringify(sorted)}'
)
`
  )
  console.log(
    `\n${Object.keys(sorted).length} buckets written in ${((performance.now() - started) / 1000).toFixed(1)}s on ${THREADS} threads`
  )
  if (short)
    console.error(`${short} bucket(s) came up short — raise --tries, or the tier's dials are too tight to fill.`)
  if (short || failures) process.exit(1)
} else {
  const listed = demands.filter(demand => puzzleSeeds[demand.hash]?.length)
  for (const demand of demands)
    console.log(
      `${describe(demand).padEnd(42)} ${String(puzzleSeeds[demand.hash]?.length ?? 0).padStart(4)}/${targetFor(demand)} listed`
    )
  console.log(
    `\n${listed.length}/${demands.length} buckets listed, over ${demands.reduce((sum, demand) => sum + demand.rooms, 0)} rooms`
  )
}
