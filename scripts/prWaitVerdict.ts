export type Check = { name: string; bucket: string }

export type PrState = {
  /** MERGEABLE, CONFLICTING, or UNKNOWN while GitHub still works it out. */
  mergeable: string
  checks: readonly Check[]
  /** Polls made so far, this one included. */
  polls: number
}

export type Verdict = "conflict" | "no-run" | "waiting" | "red" | "green"

/** Polls without a single check before the wait gives up: a run starts within a few, or never. */
export const NO_RUN_POLLS = 6

/**
 * What a PR's CI says right now. A conflicting PR starts no run at all, so it is reported at once instead of
 * waited on, and "no checks" after the grace polls means no run is coming.
 */
export const prVerdict = ({ mergeable, checks, polls }: PrState): Verdict => {
  if (mergeable === "CONFLICTING") return "conflict"
  if (checks.length === 0) return polls >= NO_RUN_POLLS ? "no-run" : "waiting"
  if (checks.some(check => check.bucket === "pending")) return "waiting"
  return checks.every(check => check.bucket === "pass" || check.bucket === "skipping") ? "green" : "red"
}
