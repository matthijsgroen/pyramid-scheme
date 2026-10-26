import { workerData, type MessagePort } from "worker_threads"
import { DONE, FOUND_AT, NEXT, type StageJob, type WorkerReply } from "./layoutSearchPool"

/** A search worker (layoutSearchPool.ts): takes the next stage job until none is left, skipping a stage when an
 * earlier stage of its floor has already found, and replies with what each decided. */
const { jobs, counters, port } = workerData as { jobs: StageJob[]; counters: Int32Array; port: MessagePort }
const reply = (message: WorkerReply) => {
  port.postMessage(message)
  Atomics.add(counters, DONE, 1)
  Atomics.notify(counters, DONE)
}

try {
  const { searchStage } = await import("./layoutPicker")
  for (let job = Atomics.add(counters, NEXT, 1); job < jobs.length; job = Atomics.add(counters, NEXT, 1)) {
    const { group, stage } = jobs[job]
    try {
      if (Atomics.load(counters, FOUND_AT + group) < stage) {
        reply({ job, searched: null })
        continue
      }
      const searched = searchStage(jobs[job])
      if (searched.kind === "found")
        for (let at = Atomics.load(counters, FOUND_AT + group); stage < at;) {
          const was = Atomics.compareExchange(counters, FOUND_AT + group, at, stage)
          if (was === at) break
          at = was
        }
      reply({ job, searched })
    } catch (error) {
      reply({ job, error: String((error as Error)?.stack ?? error) })
    }
  }
} catch (error) {
  // Nothing could be searched here: answer every job still waiting so the bake fails at once rather than hang.
  for (let job = Atomics.add(counters, NEXT, 1); job < jobs.length; job = Atomics.add(counters, NEXT, 1))
    reply({ job, error: String((error as Error)?.stack ?? error) })
}
