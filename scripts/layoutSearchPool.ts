import { availableParallelism } from "os"
import { MessageChannel, receiveMessageOnPort, Worker, type MessagePort } from "worker_threads"
import type { LayoutNotFound, LayoutPin } from "../src/worldGen/carveSeedSearch"
import type { FloorConfig } from "../src/worldGen/types"

/** One side-path stage of one floor to search; `group` numbers the floor among those searched. */
export type StageJob = {
  journeyId: string
  floor: FloorConfig
  levelNr: number
  floorIndex: number
  /** The index into the floor's `sidePathStages`. */
  stage: number
  group: number
}

/** What a stage's search decided; null for a stage left unsearched because an earlier stage of its floor found. */
export type StageSearched = LayoutPin | LayoutNotFound | null

export type WorkerReply = { job: number; searched: StageSearched } | { job: number; error: string }

/** The shared counters: the next job to hand out, the jobs done, the workers running, then per floor the first stage
 * that found. */
export const NEXT = 0
export const DONE = 1
/** Workers still running, each counted off when it stops: all stopped with jobs undone is a failed search. */
export const LIVE = 2
export const FOUND_AT = 3
export const NONE_FOUND = 0x7fffffff

/** In the order the workers take them: every floor's first stage before any floor's second, so a later stage is
 * mostly started only once the stages before it have failed, and is skipped when one of them found. */
export const workOrder = (jobs: readonly StageJob[]): number[] =>
  jobs.map((_, i) => i).sort((a, b) => jobs[a].stage - jobs[b].stage || jobs[a].group - jobs[b].group)

const WORKERS = Math.max(1, Number(process.env.LAYOUT_WORKERS ?? availableParallelism() - 1))

/**
 * SEARCHES EVERY STAGE JOB ACROSS THE MACHINE'S CORES and hands back what each decided, in job order. Synchronous:
 * the bake's layout stage runs inside the world build, so this thread sleeps on the shared counters while the
 * workers search, and reads their replies straight off their ports. What a stage decides depends on the stage alone,
 * never on which worker searched it or when.
 */
export const searchStages = (jobs: StageJob[], groups: number): StageSearched[] => {
  if (jobs.length === 0) return []
  const order = workOrder(jobs)
  const counters = new Int32Array(new SharedArrayBuffer(4 * (FOUND_AT + groups)))
  counters.fill(NONE_FOUND, FOUND_AT)
  const ports: MessagePort[] = []
  const count = Math.min(WORKERS, jobs.length)
  Atomics.store(counters, LIVE, count)
  const workers = Array.from({ length: count }, () => {
    const { port1, port2 } = new MessageChannel()
    ports.push(port1)
    return new Worker(new URL("./layoutSearchWorker.ts", import.meta.url), {
      workerData: { jobs: order.map(i => jobs[i]), counters, port: port2 },
      transferList: [port2],
    })
  })
  const searched: Array<StageSearched | undefined> = new Array(jobs.length).fill(undefined)
  const drain = () => {
    for (const port of ports)
      for (let reply = receiveMessageOnPort(port); reply; reply = receiveMessageOnPort(port)) {
        const message = reply.message as WorkerReply
        if ("error" in message) {
          for (const worker of workers) void worker.terminate()
          throw new Error(`layout search worker failed: ${message.error}`)
        }
        searched[order[message.job]] = message.searched
      }
  }
  try {
    for (let done = Atomics.load(counters, DONE); done < jobs.length; done = Atomics.load(counters, DONE)) {
      Atomics.wait(counters, DONE, done, 1000)
      drain()
      if (Atomics.load(counters, LIVE) === 0 && Atomics.load(counters, DONE) < jobs.length)
        throw new Error(
          `layout search workers stopped with ${jobs.length - Atomics.load(counters, DONE)} stage(s) undone`
        )
    }
    drain()
    const missing = searched.flatMap((result, i) => (result === undefined ? [i] : []))
    if (missing.length > 0) throw new Error(`layout search: no reply for stage job(s) ${missing.join(", ")}`)
  } finally {
    for (const worker of workers) void worker.terminate()
  }
  return searched as StageSearched[]
}
