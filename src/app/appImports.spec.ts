import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const SRC = path.resolve(import.meta.dirname, "..")
const FORBIDDEN = /^(node:fs|fs|node:fs\/promises)$|\/(worldSpec|lockCatalogue|webCatalogue)$/
const IMPORT = /^\s*(?:import|export)\s(?!type\s)[^'"]*?from\s*['"]([^'"]+)['"]|^\s*import\s*['"]([^'"]+)['"]/gm

const resolveFile = (from: string, spec: string): string | undefined => {
  const base = spec.startsWith("@/") ? path.join(SRC, spec.slice(2)) : path.resolve(path.dirname(from), spec)
  return [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")].find(
    f => /\.tsx?$/.test(f) && existsSync(f)
  )
}

const offenders = (entry: string): string[] => {
  const seen = new Set<string>()
  const found: string[] = []
  const walk = (file: string) => {
    if (seen.has(file)) return
    seen.add(file)
    for (const m of readFileSync(file, "utf8").matchAll(IMPORT)) {
      const spec = m[1] ?? m[2]
      if (FORBIDDEN.test(spec)) found.push(`${path.relative(SRC, file)} -> ${spec}`)
      else if (spec.startsWith("@/") || spec.startsWith(".")) {
        const next = resolveFile(file, spec)
        if (next) walk(next)
      }
    }
  }
  walk(entry)
  return found
}

describe("app bundle", () => {
  it("never reaches modules that read the disk from src/main.tsx", () => {
    expect(offenders(path.join(SRC, "main.tsx"))).toEqual([])
  })
})
