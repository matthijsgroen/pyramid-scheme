#!/usr/bin/env tsx
/**
 * HOW MUCH ROOM EACH BAKED FLOOR HAS TO CARVE. Every floor is carved at its pinned packing and side paths on the full
 * runtime ladder at SEEDS seed offsets from its pinned seed, each carve judged by the bake's hard criteria; a floor's
 * slack is how many of them pass. The bake pins one seed that passes, so a floor passing at few seeds still bakes,
 * and breaks the moment anything upstream shifts its draws.
 *
 * The counts are a ratchet in carveSlack.results.json: a floor that passes at fewer seeds than recorded fails the run,
 * one that passes at more is written down. `-u` writes every count as measured.
 * Run: yarn carve-slack [-u]
 */
import { spawn } from "child_process"
import { readFileSync, writeFileSync } from "fs"
import { availableParallelism } from "os"
import { generatedWorldConfigs } from "../src/data/generatedWorld"
import { seedAtOffset } from "../src/worldGen/carveSeedSearch"
import { floorSearch } from "./layoutPicker"

export const SEEDS = 40
const RESULTS = new URL("./carveSlack.results.json", import.meta.url)

export type Slack = Record<string, number>

/** What `measured` against `recorded` decides: the floors that lost slack, and the ratchet to write. */
export const ratchet = (recorded: Slack, measured: Slack, update: boolean) => {
  const lost = Object.keys(measured).filter(key => key in recorded && measured[key] < recorded[key])
  const next: Slack = {}
  for (const key of Object.keys(measured).sort())
    next[key] = update || !(key in recorded) ? measured[key] : Math.max(recorded[key], measured[key])
  return { lost, next }
}

const floorKeys = () =>
  Object.entries(generatedWorldConfigs).flatMap(([journeyId, sites]) =>
    sites.flatMap((site, li) => site.map((_, floorIndex) => ({ journeyId, levelNr: li + 1, floorIndex })))
  )

const keyOf = ({ journeyId, levelNr, floorIndex }: ReturnType<typeof floorKeys>[number]) =>
  `${journeyId} L${levelNr} F${floorIndex}`

const measureShard = (shard: number, shards: number) => {
  floorKeys().forEach((at, i) => {
    if (i % shards !== shard) return
    const floor = generatedWorldConfigs[at.journeyId][at.levelNr - 1][at.floorIndex]
    const { base, authored, assembleAt, options } = floorSearch(at.journeyId, floor, at.levelNr, at.floorIndex)
    const stage = {
      outsideLock: floor.outsideLock ?? [],
      ...(floor.corridorsTakeTwo ? { corridorsTakeTwo: true as const } : {}),
    }
    let passed = 0
    for (let offset = 0; offset < SEEDS; offset++) {
      const result = assembleAt(seedAtOffset(base, offset), floor.packing ?? authored, Infinity, stage)
      if (!options.judge(result)) passed++
    }
    console.log(JSON.stringify([keyOf(at), passed]))
  })
}

const measureAll = async (): Promise<Slack> => {
  const shards = Math.max(1, availableParallelism() - 1)
  const runs = Array.from(
    { length: shards },
    (_, shard) =>
      new Promise<string>((resolve, reject) => {
        const child = spawn("yarn", ["tsx", "scripts/carveSlack.ts", "--shard", `${shard}/${shards}`], {
          stdio: ["ignore", "pipe", "inherit"],
        })
        let out = ""
        child.stdout.on("data", chunk => (out += chunk))
        child.on("exit", code => (code === 0 ? resolve(out) : reject(new Error(`shard ${shard} exited ${code}`))))
      })
  )
  const lines = (await Promise.all(runs)).join("").trim().split("\n").filter(Boolean)
  return Object.fromEntries(lines.map(line => JSON.parse(line) as [string, number]))
}

const main = async () => {
  const shardArg = process.argv.indexOf("--shard")
  if (shardArg >= 0) {
    const [shard, shards] = process.argv[shardArg + 1].split("/").map(Number)
    return measureShard(shard, shards)
  }
  const update = process.argv.includes("-u")
  const recorded: Slack = (() => {
    try {
      return JSON.parse(readFileSync(RESULTS, "utf8"))
    } catch {
      return {}
    }
  })()
  const measured = await measureAll()
  const { lost, next } = ratchet(recorded, measured, update)
  writeFileSync(RESULTS, JSON.stringify(next, null, 2) + "\n")
  const tight = Object.entries(measured)
    .filter(([, passed]) => passed < SEEDS)
    .sort((a, b) => a[1] - b[1])
  console.log(`${Object.keys(measured).length} floors, ${tight.length} short of ${SEEDS}/${SEEDS}:`)
  for (const [key, passed] of tight) console.log(`    ${key.padEnd(34)} ${passed}/${SEEDS}`)
  if (lost.length === 0 || update) return
  console.error(`✗ ${lost.length} floor(s) lost slack (yarn carve-slack -u to accept):`)
  for (const key of lost) console.error(`    ${key}: ${recorded[key]} -> ${measured[key]}`)
  process.exit(1)
}

if (process.argv[1]?.endsWith("carveSlack.ts")) void main()
