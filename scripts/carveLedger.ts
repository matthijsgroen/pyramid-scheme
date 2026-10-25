import { createHash } from "crypto"
import { existsSync, readFileSync, writeFileSync } from "fs"
import { dirname, join, resolve } from "path"
import { fileURLToPath } from "url"
import type { LayoutNotFound } from "../src/worldGen/carveSeedSearch"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
export const LEDGER_PATH = join(root, "src/data/carveLedger.json")

/** Floors the bounded search found no layout for, by `journey#level#floor`, with what it found. An entry holds only
 * while its `hash` still equals what the floor hashes to now, so a floor is skipped exactly as long as nothing that
 * could change the outcome has changed. An entry of any other kind is read as absent. */
export type CarveLedgerEntry = { kind: "notFound"; hash: string; result: LayoutNotFound }
export type CarveLedger = Record<string, CarveLedgerEntry | undefined>

export const readLedger = (): CarveLedger =>
  existsSync(LEDGER_PATH) ? JSON.parse(readFileSync(LEDGER_PATH, "utf8")) : {}

export const writeLedger = (ledger: CarveLedger) =>
  writeFileSync(
    LEDGER_PATH,
    JSON.stringify(Object.fromEntries(Object.entries(ledger).sort(([a], [b]) => a.localeCompare(b))), null, 2) + "\n"
  )

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
