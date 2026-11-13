#!/usr/bin/env tsx
/**
 * Waits for a PR's CI and says how it ended, every job by name.
 *
 *   yarn pr:wait 443
 *
 * Exits 0 only when every job passed. A conflict with main is reported at once (GitHub starts no run on a
 * conflicting PR): merge origin/main into the branch and push again.
 */
import { execFileSync } from "node:child_process"
import { setTimeout as sleep } from "node:timers/promises"
import { prVerdict, type Check } from "./prWaitVerdict"

const POLL_MS = 20_000
const pr = process.argv[2]
if (!pr || !/^\d+$/.test(pr)) {
  console.error("usage: yarn pr:wait <pr number>")
  process.exit(2)
}

const gh = (...args: string[]) => execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })

const checksOf = (): Check[] => {
  try {
    return JSON.parse(gh("pr", "checks", pr, "--json", "name,bucket"))
  } catch {
    // `gh pr checks` fails while the PR has no checks at all.
    return []
  }
}

for (let polls = 1; ; polls++) {
  const mergeable = JSON.parse(gh("pr", "view", pr, "--json", "mergeable")).mergeable as string
  const checks = checksOf()
  const verdict = prVerdict({ mergeable, checks, polls })
  if (verdict === "waiting") {
    await sleep(POLL_MS)
    continue
  }
  for (const check of checks) console.log(`${check.name}: ${check.bucket}`)
  if (verdict === "conflict") console.error(`#${pr} CONFLICTING: merge origin/main into the branch and push again.`)
  if (verdict === "no-run") console.error(`#${pr} has no CI run: was the branch pushed, and is it mergeable?`)
  if (verdict === "red") console.error(`#${pr} is red.`)
  if (verdict === "green") console.log(`#${pr} is green.`)
  process.exit(verdict === "green" ? 0 : 1)
}
