import { createHash } from "crypto"
import { existsSync, readFileSync } from "fs"
import { dirname, join, resolve } from "path"
import { fileURLToPath } from "url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
export const LEDGER_PATH = join(root, "src/data/carveLedger.json")

/** Floors the search tried and could not satisfy, by `journey#level#floor`. An entry holds only while its
 * `hash` still equals what the floor hashes to now, so a floor is skipped exactly as long as nothing that
 * could change the outcome has changed. */
export type CarveLedger = Record<string, { hash: string; refusal: string }>

export const readLedger = (): CarveLedger =>
  existsSync(LEDGER_PATH) ? JSON.parse(readFileSync(LEDGER_PATH, "utf8")) : {}

// The baked world is the search's own output, so it cannot be an input to what the search decides.
const OUTPUTS = new Set([join(root, "src/data/generatedWorld.ts"), LEDGER_PATH])
const SPECIFIER = /(?:from|import\()\s*["']([^"']+)["']/g
const CANDIDATES = ["", ".ts", ".tsx", ".json", "/index.ts", "/index.tsx"]

const resolveImport = (from: string, specifier: string): string | null => {
  const base = specifier.startsWith("@/")
    ? join(root, "src", specifier.slice(2))
    : specifier.startsWith(".")
      ? resolve(dirname(from), specifier)
      : null
  if (!base) return null
  for (const suffix of CANDIDATES) {
    const candidate = base + suffix
    if (existsSync(candidate) && /\.(tsx?|json)$/.test(candidate)) return candidate
  }
  return null
}

/** A hash of every source file the carve can read: the transitive imports of `entries`. A change to the
 * assembler, the lock walk, or anything either one imports changes it, which is what lets a floor the
 * search once failed be searched again the day the assembler could now satisfy it. */
export const sourceFingerprint = (entries: string[]): string => {
  const seen = new Set<string>()
  const queue = entries.map(entry => join(root, entry))
  while (queue.length > 0) {
    const file = queue.pop()!
    if (seen.has(file) || OUTPUTS.has(file)) continue
    seen.add(file)
    if (!file.endsWith(".json"))
      for (const [, specifier] of readFileSync(file, "utf8").matchAll(SPECIFIER)) {
        const next = resolveImport(file, specifier)
        if (next) queue.push(next)
      }
  }
  const hash = createHash("sha1")
  for (const file of [...seen].sort()) hash.update(file.slice(root.length)).update(readFileSync(file))
  return hash.digest("hex")
}

export const floorHash = (sources: string, floor: unknown, params: unknown): string =>
  createHash("sha1").update(sources).update(JSON.stringify(floor)).update(JSON.stringify(params)).digest("hex")
