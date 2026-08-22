/**
 * Scans one window of seeds for one configuration and reports what it kept.
 *
 * Pull-based: it announces itself idle on boot and after every result, and the pool answers with the
 * next window or with a shutdown. Clean-seed yield runs from about 80% down to a fifth of a percent
 * between buckets, so which window is slow cannot be predicted — handing work out on demand is what
 * keeps every thread busy to the end.
 *
 * Started through an eval shim that registers the tsx loader (see puzzleSeeds.ts), so there is no
 * bundling step and no build artifact.
 */
import { parentPort } from "node:worker_threads"
import { findSeeds } from "../src/game/seeds/findSeeds"
import { ALL_FAMILY_META } from "../src/mods/allFamilyMeta"
import type { SeedTask, SeedWorkerMessage } from "./seedProtocol"

const byId = new Map(ALL_FAMILY_META.map(family => [family.id, family]))
const port = parentPort!

const run = (task: SeedTask): SeedWorkerMessage => {
  const seedable = byId.get(task.familyId)?.seedable
  if (!seedable) return { type: "result", taskId: task.taskId, found: [], error: `${task.familyId} is not seedable` }
  try {
    const options = seedable.resolveOptions({ difficulty: task.difficulty })
    return { type: "result", taskId: task.taskId, found: findSeeds(seedable, options, task.from, task.count) }
  } catch (error) {
    // Reported rather than thrown: one bad window must not take the thread down and strand the pool.
    return { type: "result", taskId: task.taskId, found: [], error: String(error) }
  }
}

port.on("message", (message: { type: "task"; task: SeedTask } | { type: "shutdown" }) => {
  if (message.type === "shutdown") return process.exit(0)
  port.postMessage(run(message.task))
  port.postMessage({ type: "idle" } satisfies SeedWorkerMessage)
})

port.postMessage({ type: "idle" } satisfies SeedWorkerMessage)
