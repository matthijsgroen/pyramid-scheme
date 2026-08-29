#!/usr/bin/env tsx
/**
 * Finds and verifies the seeds src/data/puzzleSeeds.ts ships — boards proven offline to build on
 * their first attempt, so play time skips the search. See docs/instructions/puzzle-screens.md §6.1.
 *
 * **Only what is missing is searched for.** A bucket that already holds its floor is left exactly as
 * it shipped, so adding a puzzle family costs the search for THAT family's buckets and re-authoring a
 * journey costs the buckets it moved rooms into — never the whole artifact, and never a diff that
 * silently deals every other family's rooms a different board.
 *
 * The artifact is written already formatted, so these commands are a single process — yarn appends a
 * command's arguments to the END of its script, and a `&& prettier` tail would eat every flag below.
 *
 * Run: yarn generate-seeds [--rebuild] [--family=<id>] [--cap=<n>] [--tries=<n>] [--parallel=<n>]
 *      yarn verify-seeds [--family=<id>]
 *      yarn seeds-info
 *
 *   --rebuild   re-search every bucket, including the ones already covered — for when the generator
 *               itself changed and what shipped was proven under code that no longer exists
 *   --family    only these families (comma-separated); other buckets keep the seeds they have
 *   --cap       most seeds to keep per bucket, so one hot configuration cannot dominate the artifact
 *               (a bucket otherwise aims at SURPLUS × the rooms that draw from it, never at exactly them)
 *   --tries     most seeds to test per bucket before reporting the bucket short
 *   --parallel  worker threads; defaults to two fewer than the machine has cores
 *   --batch     stop after this many NEW seeds and write what was found (default 200, 0 = no limit).
 *               A run is then a bounded job you can repeat, which is what makes an expensive family
 *               fillable in sittings instead of in one long one.
 *
 * A run is RESUMABLE and it checkpoints: **every seed counts the moment it lands**, the artifact is written
 * whenever a bucket fills and on ctrl-c, and the next run scans above the seeds each bucket already holds.
 * So a family with an expensive generator can be filled in batches, and an interrupted pass never re-earns
 * what it had — nor throws away a find because some other thread had not come back yet.
 *
 * `verify` is the other half of that: it rebuilds listed seeds (a sample of 5 per bucket, or every one with
 * --all) and drops the ones that no longer grade,
 * which is what a change to a GENERATOR (rather than to a tier's dials) invalidates. A dial change moves the
 * bucket's hash instead, and the old bucket is dropped as unwanted. After verifying, `generate` refills only
 * the holes.
 */
import { cpus } from "node:os"
import { writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { Worker } from "node:worker_threads"
import { worldLevelSites } from "../src/data/worldLevels"
import { puzzleSeeds } from "../src/data/puzzleSeeds"
import type { Grade } from "../src/game/families/familyMeta"
import type { FoundSeed } from "../src/game/seeds/findSeeds"
import {
  enumerateConfigs,
  seedTarget,
  seedFloor,
  SEED_CAP,
  type ConfigDemand,
} from "../src/game/seeds/enumerateConfigs"
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
// How many seeds one task scans before reporting. Nothing waits on a window any more, so this is only the
// granularity a checkpoint and an interrupt save at. At 500 seeds that is a second for most families and SIX
// MINUTES for rush hour, whose generator climbs — long enough that a killed run lost real work. 128 keeps
// the messaging in the noise and the progress in sight.
const CHUNK = 128
const only = flag("family")?.split(",")
const rebuild = argv.includes("--rebuild")

const allDemands = enumerateConfigs(worldLevelSites, ALL_FAMILY_META)
const demands = allDemands.filter(demand => !only || only.includes(demand.familyId))
const targetFor = (demand: ConfigDemand) => seedTarget(demand, CAP)
const describe = (demand: ConfigDemand) => `${demand.familyId}/${demand.difficulty} (${demand.rooms} rooms)`

const summarise = (grades: Grade[]) => {
  if (!grades.length) return ""
  const steps = grades.map(grade => grade.steps).sort((left, right) => left - right)
  const deepest = [...new Set(grades.map(grade => grade.deepest).filter(Boolean))]
  return `steps ${steps[0]}-${steps[steps.length - 1]} (median ${steps[steps.length >> 1]}), demands ${deepest.join("/") || "nothing"}`
}

/**
 * What one bucket has collected so far.
 *
 * **Every seed stands on its own.** A seed earns its place by building its own board, so nothing about it
 * depends on which other seeds were tested first — which is why a find is banked the moment it arrives,
 * whatever else is still in flight. Holding finds back until every lower window had reported would make the
 * artifact byte-identical whatever the thread count, and would cost a killed run everything it had earned
 * above the first window still out. Reproducibility is bought more cheaply below, by trimming a full bucket
 * to its lowest seeds instead of to the ones that landed first.
 */
type Bucket = {
  demand: ConfigDemand
  target: number
  found: FoundSeed[]
  done: boolean
  /**
   * Seeds this bucket already shipped with, and the seed its scan resumes above.
   *
   * **This is what makes a run resumable.** A bucket killed half full carries on above the seeds it kept
   * instead of re-earning them. A window below that seed may never have been scanned when the run stopped,
   * and skipping it costs nothing: a bucket needs SOME seeds that build, not every one there is.
   */
  inherited: number[]
  resumeFrom: number
}

/** What a bucket would ship right now: the seeds it inherited plus the ones this run has earned. */
const heldBy = (bucket: Bucket) => bucket.inherited.length + bucket.found.length

const runPool = async (buckets: Bucket[]) => {
  const tasks: SeedTask[] = []
  // **Round-robin across buckets, not bucket by bucket.** Queued in bucket order, ten threads all take the
  // first bucket's first ten windows — so a cheap bucket waits behind an expensive one for no reason.
  // Interleaved, every bucket makes progress from the start.
  for (let window = 0; window * CHUNK < TRIES; window++)
    for (const bucket of buckets)
      tasks.push({
        taskId: tasks.length,
        hash: bucket.demand.hash,
        familyId: bucket.demand.familyId,
        difficulty: bucket.demand.difficulty,
        from: bucket.resumeFrom + window * CHUNK,
        count: CHUNK,
      })

  const byHash = new Map(buckets.map(bucket => [bucket.demand.hash, bucket]))
  const pending = new Map<number, SeedTask>()
  let next = 0
  let completed = 0
  let collected = 0
  const errors: string[] = []
  // What the last checkpoint is worth having: either enough new seeds to be worth the write, or enough
  // WALL TIME that losing it would hurt. The second half is the one that matters for a slow generator —
  // a bucket that yields two seeds an hour would otherwise never trigger the first.
  let sinceWrite = 0
  let lastWrite = performance.now()
  const SAVE_SEEDS = 16
  const SAVE_MINUTES = 2

  // The worker is TypeScript, which a worker thread will not load on its own. Booting it through a
  // shim that registers the tsx loader first is what replaces a bundling step and a build artifact.
  const entry = JSON.stringify(new URL("./seedWorker.ts", import.meta.url).href)
  const boot = `import("tsx/esm/api").then(tsx => { tsx.register(); return import(${entry}) })`

  if (!tasks.length) return { failures: 0, collected: 0 }

  await new Promise<void>((resolve, reject) => {
    const workers = Array.from({ length: Math.min(THREADS, tasks.length) }, () => new Worker(boot, { eval: true }))
    let alive = workers.length

    const handOut = (worker: Worker) => {
      // Skip past anything whose bucket already has what it needs — most of the queue, since every
      // bucket is queued for the full try budget and most fill long before spending it.
      while (next < tasks.length && byHash.get(tasks[next].hash)!.done) next++
      if (next >= tasks.length || (BATCH > 0 && collected >= BATCH)) {
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
        bucket.found.push(...message.found)
        sinceWrite += message.found.length
        collected += message.found.length
        const filled = heldBy(bucket) >= bucket.target && !bucket.done
        if (filled) bucket.done = true
        // Written as it goes rather than at the end: a pass over a family with a slow generator is an hour
        // of work, and an hour of work that only lands if nobody presses ctrl-c is an hour nobody spends.
        // Three reasons to write — a bucket filled, enough new seeds to be worth saving, or enough time
        // spent that losing it would cost more than the write.
        if (filled || sinceWrite >= SAVE_SEEDS || performance.now() - lastWrite > SAVE_MINUTES * 60_000) {
          checkpoint(buckets)
          sinceWrite = 0
          lastWrite = performance.now()
        }
        completed++
        // The bucket furthest from its target is named, because on a long run it is the one everything else
        // is waiting on — and a slow bucket that reports its count looks slow rather than hung.
        if (completed % 40 === 0) {
          const slowest = buckets
            .filter(bucket => !bucket.done)
            .sort((left, right) => heldBy(left) / left.target - heldBy(right) / right.target)[0]
          const behind = slowest ? `, ${describe(slowest.demand)} at ${heldBy(slowest)}/${slowest.target}` : ""
          process.stderr.write(`\r${buckets.filter(b => b.done).length}/${buckets.length} buckets${behind}`)
        }
      })
      worker.on("error", reject)
      worker.on("exit", () => {
        if (--alive === 0) resolve()
      })
    }
  })

  process.stderr.write("\r".padEnd(110) + "\r")
  for (const error of errors) console.error(error)
  return { failures: errors.length, collected }
}

/**
 * The artifact as it stands right now — every seed every bucket holds, partial ones included.
 *
 * Called at the end of a run, whenever a bucket fills, and on an interrupt. A partial list is not a lie:
 * `seeds-info` reports it as SHORT and `puzzleSeeds.spec.ts` fails on it, so a half-filled bucket is
 * visible rather than silently repeating boards.
 */
const writeArtifact = (buckets: Bucket[], allHashes: Set<string>) => {
  const lists: Record<string, number[]> = Object.fromEntries(
    Object.entries(puzzleSeeds).filter(([hash]) => allHashes.has(hash))
  )
  for (const bucket of buckets) {
    // Sorted before the trim, not just for a tidy file: an overfull bucket then keeps its LOWEST seeds
    // whichever window landed first, so two runs that scanned the same space agree on what they shipped.
    const found = bucket.found.map(entry => entry.seed).sort((left, right) => left - right)
    // Inherited seeds come first and are never dropped: they were proven under these same options, and a
    // resumed run has scanned only the space ABOVE them.
    const merged = [...new Set([...bucket.inherited, ...found])].slice(0, bucket.target)
    if (merged.length) lists[bucket.demand.hash] = merged
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
  return sorted
}

/**
 * How many new seeds one run collects before it stops and writes.
 *
 * **A run should be a bounded job.** Filling rush hour's wizard bucket from empty is an hour; a command that
 * takes an hour is a command nobody starts, and one that takes five minutes and can be run again is one
 * anybody can fit in. 0 means "keep going until every bucket is full".
 */
const BATCH = number("batch", 200)

/**
 * How many of a bucket's seeds `verify` rebuilds, or 0 for all of them (--all).
 *
 * Five, because what breaks a listed seed is a change to the GENERATOR, and that breaks the whole bucket
 * rather than one entry — so a handful is the same answer for a hundredth of the work.
 */
const SAMPLE = argv.includes("--all") ? 0 : number("sample", 5)

/** Set by the generate branch, so the pool and the signal handler can write without threading it through. */
let checkpoint: (buckets: Bucket[]) => void = () => {}

if (command === "generate") {
  // A bucket at or above its floor covers the rooms that draw from it, so there is nothing to search
  // for: it keeps the seeds it shipped with. That is what makes adding a family cheap, and it is also
  // what keeps its diff honest — the boards every other room serves are the boards they served before.
  const covered = (demand: ConfigDemand) => (puzzleSeeds[demand.hash]?.length ?? 0) >= seedFloor(demand)
  const outstanding = rebuild ? demands : demands.filter(demand => !covered(demand))
  const skipped = demands.length - outstanding.length
  if (skipped) console.log(`${skipped} bucket(s) already covered, left as they are — --rebuild re-searches them\n`)
  if (!outstanding.length) console.log("Nothing to search for: every bucket the world asks for is covered.")

  const buckets: Bucket[] = outstanding.map(demand => {
    const inherited = rebuild ? [] : (puzzleSeeds[demand.hash] ?? [])
    return {
      demand,
      target: targetFor(demand),
      found: [],
      done: false,
      inherited,
      // Above the highest seed already held — see Bucket.resumeFrom. A rebuild starts over from 1.
      resumeFrom: inherited.length ? Math.max(...inherited) + 1 : 1,
    }
  })
  const resumed = buckets.filter(bucket => bucket.inherited.length)
  if (resumed.length)
    console.log(
      `${resumed.length} partly filled bucket(s) resumed above the seeds they hold: ` +
        resumed.map(bucket => `${describe(bucket.demand)} +${bucket.target - bucket.inherited.length}`).join(", ") +
        "\n"
    )

  const allHashes = new Set(allDemands.map(demand => demand.hash))
  checkpoint = current => writeArtifact(current, allHashes)
  // **An interrupt is a pause, not a loss.** Every seed found so far is written, and the next run picks up
  // above it — which is what makes a long pass something you can run in batches.
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.on(signal, () => {
      const written = writeArtifact(buckets, allHashes)
      console.log(`\ninterrupted — ${Object.keys(written).length} buckets written; rerun to carry on`)
      process.exit(1)
    })

  const started = performance.now()
  const { failures, collected } = await runPool(buckets)

  // The artifact is a function of the world — buckets nothing asks for any more are dropped, which
  // re-authoring a journey produces every time it moves a room between tiers, and puzzleSeeds.spec.ts holds
  // it to that. Keyed on the FULL demand set, or narrowing to one family would delete the others' buckets.
  const sorted = writeArtifact(buckets, allHashes)
  let short = 0
  for (const bucket of buckets) {
    const shipped = sorted[bucket.demand.hash]?.length ?? 0
    // Never let a bucket come up short quietly: a half-filled list reads as covered until a player
    // meets the room that repeats.
    if (shipped < bucket.target) short++
    const verdict = shipped < bucket.target ? `SHORT ${shipped}/${bucket.target}` : `${shipped} seeds`
    const grades = bucket.found.map(entry => entry.grade)
    console.log(`${describe(bucket.demand).padEnd(42)} ${verdict.padEnd(18)} ${summarise(grades)}`)
  }
  console.log(
    `\n${Object.keys(sorted).length} buckets written in ${((performance.now() - started) / 1000).toFixed(1)}s on ${THREADS} threads`
  )
  // **A batch that ran out of budget is not a failure**, it is the next sitting's work. Only a run that was
  // allowed to search to exhaustion and still came up short means the tier's dials cannot fill.
  const batched = BATCH > 0 && collected >= BATCH
  if (batched)
    console.log(
      `batch of ${BATCH} new seed(s) collected — ${short} bucket(s) still short. Run again to carry on (--batch=0 to finish in one go).`
    )
  else if (short)
    console.error(`${short} bucket(s) came up short — raise --tries, or the tier's dials are too tight to fill.`)
  if ((short && !batched) || failures) process.exit(1)
} else if (command === "verify") {
  /**
   * Listed seeds, rebuilt and re-graded — a sample of each bucket, or all of them with `--all`.
   *
   * **Single-threaded on purpose.** Verification is one build per seed against a list that is thousands of
   * entries at most, so it is minutes; the pool exists for searches that are hours, and its bookkeeping is
   * about windows of UNTESTED seeds, which this is not.
   */
  const metaFor = new Map(ALL_FAMILY_META.map(meta => [meta.id, meta]))
  const lists: Record<string, number[]> = { ...puzzleSeeds }
  let dropped = 0
  for (const demand of demands) {
    const listedSeeds = puzzleSeeds[demand.hash]
    if (!listedSeeds?.length) continue
    const meta = metaFor.get(demand.familyId)
    if (!meta?.seedable) continue
    const options = meta.seedable.resolveOptions({ difficulty: demand.difficulty })
    const builds = (seed: number) => {
      try {
        return meta.seedable!.grade(meta.seedable!.generate(seed, options, 1), options) !== null
      } catch {
        return false
      }
    }
    // **A sample is the default because verification is a smoke test, not a proof.** What invalidates a
    // listed seed is a change to the GENERATOR, and that breaks a whole bucket rather than one entry in it —
    // so five seeds say what five hundred would, for a hundredth of the work, and five is a check you run
    // before every regeneration instead of once a month. `--all` grades every entry and drops individuals.
    const sample = SAMPLE > 0 ? listedSeeds.slice(0, SAMPLE) : listedSeeds
    const broken = sample.filter(seed => !builds(seed))
    if (broken.length && SAMPLE > 0) {
      // Rot in the sample condemns the bucket whole: the seeds nobody looked at were proven under the same
      // code, so keeping them would be trusting exactly what just failed.
      dropped += listedSeeds.length
      lists[demand.hash] = []
      console.log(
        `${describe(demand).padEnd(42)} ${broken.length}/${sample.length} sampled seeds broken — bucket dropped`
      )
      continue
    }
    const kept = SAMPLE > 0 ? listedSeeds : listedSeeds.filter(seed => !broken.includes(seed))
    dropped += listedSeeds.length - kept.length
    lists[demand.hash] = kept
    const verdict =
      kept.length === listedSeeds.length ? "ok" : `dropped ${listedSeeds.length - kept.length} of ${listedSeeds.length}`
    console.log(`${describe(demand).padEnd(42)} ${verdict}`)
  }

  if (dropped) {
    const wanted = new Set(allDemands.map(demand => demand.hash))
    const sorted = Object.keys(lists)
      .filter(hash => wanted.has(hash) && lists[hash].length)
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
    console.log(`\n${dropped} seed(s) no longer build their board — dropped. Run yarn generate-seeds to refill.`)
    process.exit(1)
  }
  console.log("\nEvery listed seed still builds the board it was proven under.")
} else {
  const listed = demands.filter(demand => puzzleSeeds[demand.hash]?.length)
  // Reported against the FLOOR, not the target: a bucket over its demand is fine however far short
  // of 1.5× it sits, and a readout that cried wolf on healthy buckets would train everyone to
  // regenerate for nothing. `want` is what a regeneration would fill it to.
  const below = demands.filter(demand => (puzzleSeeds[demand.hash]?.length ?? 0) < seedFloor(demand))
  for (const demand of demands) {
    const have = puzzleSeeds[demand.hash]?.length ?? 0
    const verdict = have < seedFloor(demand) ? "SHORT" : have < targetFor(demand) ? "ok" : "full"
    console.log(
      `${describe(demand).padEnd(42)} ${String(have).padStart(4)} seeds  ${verdict.padEnd(5)} (floor ${String(seedFloor(demand)).padStart(3)}, want ${targetFor(demand)})`
    )
  }
  console.log(
    `\n${listed.length}/${demands.length} buckets listed, over ${demands.reduce((sum, demand) => sum + demand.rooms, 0)} rooms`
  )
  if (below.length) console.error(`${below.length} bucket(s) below their floor — run \`yarn generate-seeds\`.`)
}
