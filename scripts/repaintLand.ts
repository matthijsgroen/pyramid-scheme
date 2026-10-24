import { existsSync, readdirSync, statSync } from "fs"
import { basename, join } from "path"
import sharp from "sharp"
import type { Entry } from "./repaintQueue"

export type Axis = "both" | "x"

/** One command of an entry's import: a Blender render pair, or a `yarn` script run without a shell. */
export type Step = { kind: "scaffold" | "meshscaffold"; args: string[] } | { kind: "yarn"; args: string[] }

export type LandPlan = {
  master: string
  tier?: string
  name?: string
  slot?: string
  seamless?: Axis
  /** The master an edit was made of, whose canvas it lands on. */
  base?: string
  steps: Step[]
}

const IMAGE = /\.(png|jpe?g|webp)$/i

/** The most recently modified image in a folder: the download that just landed. */
export const newestImage = (dir: string): string | undefined =>
  readdirSync(dir)
    .filter(name => IMAGE.test(name) && !name.startsWith("."))
    .map(name => join(dir, name))
    .flatMap(path => {
      // A broken link is skipped, not fatal: it is not the download that just landed.
      try {
        const stat = statSync(path)
        return stat.isFile() ? [{ path, mtime: stat.mtimeMs }] : []
      } catch {
        return []
      }
    })
    .sort((a, b) => b.mtime - a.mtime)[0]?.path

/**
 * A floor repeats both ways and a face only along x; anything else has a shape and is never wrapped —
 * a whole-wall panel included, since it is laid with `cover` and never repeats.
 */
export const seamlessAxis = (slot: string | undefined): Axis | undefined =>
  slot === "floor" ? "both" : slot === "face" ? "x" : undefined

/** Shell words of one command line, quotes removed. No expansion: `$OBJ` stays `$OBJ`. */
export const words = (line: string): string[] =>
  (line.match(/(?:"[^"]*"|'[^']*'|[^\s"']+)+/g) ?? []).map(word => word.replace(/"([^"]*)"|'([^']*)'/g, "$1$2"))

const flag = (args: string[], name: string) => args.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3)

/**
 * What `--land` does for one entry: where the master goes, whether it is made seamless first, and the
 * commands that import it — the entry's fenced `sh` block when it has one, its `**Import:**` line otherwise.
 */
export const landPlan = (entry: Entry): LandPlan => {
  if (entry.masterOnly && entry.master) {
    const base = entry.attachments.find(path => path.startsWith("art/masters/characters/") && path !== entry.master)
    return { master: entry.master, base, steps: [] }
  }
  const [tier, name] = entry.key.split("/")
  const script = (entry.importScript ?? entry.importedBy)
    .replace(/<file>/g, `art/masters/props/${tier}/${name}.webp`)
    .replace(/\\\n\s*/g, " ")
  const steps = script
    .split("\n")
    .map(words)
    .flatMap((args): Step[] => {
      if (args[0] === "scaffold" || args[0] === "meshscaffold") return [{ kind: args[0], args: args.slice(1) }]
      if (args[0] === "yarn") return [{ kind: "yarn", args: args.slice(1) }]
      return []
    })
  const importer = steps.find(s => s.kind === "yarn" && /^import-/.test(s.args[0]))
  const master = importer?.args.slice(1).find(a => !a.startsWith("--"))
  if (!importer || !master) throw new Error(`${entry.key}: no \`yarn import-…\` line to land it with`)
  // A whole-wall panel names no slot: it has one, and it is graded as wall (tileStats.ts).
  const slot = importer.args[0] === "import-panel" ? "panel" : flag(importer.args, "slot")
  return {
    master,
    tier: flag(importer.args, "tier"),
    name: flag(importer.args, "name"),
    slot,
    seamless: seamlessAxis(slot),
    steps,
  }
}

/**
 * Scales `file` in place to `base`'s exact size when they differ — the generator hands an edit back a few
 * pixels off its master's canvas, and a face only stacks on a base of the same size. Says what it did.
 */
export const fitToBase = async (file: string, base: string | undefined): Promise<string | undefined> => {
  if (!base || !existsSync(base)) return undefined
  const [from, to] = await Promise.all([sharp(file).metadata(), sharp(base).metadata()])
  if (from.width === to.width && from.height === to.height) return undefined
  const scaled = await sharp(file).resize(to.width, to.height, { fit: "fill" }).toBuffer()
  await sharp(scaled).toFile(file)
  return `scaled ${from.width}x${from.height} → ${to.width}x${to.height} to match ${basename(base)}`
}

/** `$OBJ` and `$SHADOW`, the scaffold's two renders, swapped for the files they were written to. */
export const substitute = (args: string[], vars: Record<string, string>): string[] =>
  args.map(a => a.replace(/\$\{?(\w+)\}?/g, (whole, v: string) => vars[v] ?? whole))
