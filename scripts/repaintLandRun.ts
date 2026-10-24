import { execFileSync } from "child_process"
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync } from "fs"
import { homedir, tmpdir } from "os"
import { dirname, join } from "path"
import sharp from "sharp"
import { difficulties, type Difficulty } from "../src/data/difficultyLevels"
import { makeSeamless } from "./makeSeamless"
import { MIN_STEP, artMean, measureAll, measureRank, rankRow, verdict } from "./rankColour"
import { fitToBase, landPlan, newestImage, substitute, type Step } from "./repaintLand"
import type { Entry } from "./repaintQueue"

const BLENDER = process.env.BLENDER ?? "/Applications/Blender.app/Contents/MacOS/Blender"

/** `art/rebuild.sh`'s `scaffold` and `meshscaffold`: the object alone, then its footprint, same frame. */
const renderScaffold = (step: Step & { kind: "scaffold" | "meshscaffold" }, obj: string, shadow: string) => {
  const [subject, ...rest] = step.args
  const source =
    step.kind === "scaffold"
      ? `--primitive=${subject}`
      : `--mesh=${join(process.env.MESHES ?? "art/masters/meshes", subject)}`
  const stone = ["--colour=#a49781", "--floor=#6c6257"]
  for (const pass of [
    ["--shadow=0", "--background=none", `--out=${obj}`],
    ["--only=shadow", "--background=none", `--out=${shadow}`],
  ])
    execFileSync(BLENDER, ["-b", "-P", "scripts/renderProp.py", "--", source, ...pass, ...rest, ...stone], {
      stdio: "ignore",
    })
}

/** tile-stats prints its measurements, then either its pass line or one line per fault. */
const tileStats = (master: string, tier: string, slot: string | undefined) => {
  const out = execFileSync("yarn", ["tile-stats", master, `--tier=${tier}`, ...(slot ? [`--slot=${slot}`] : [])], {
    encoding: "utf8",
  }).trim()
  console.log(out)
  const lines = out.split("\n")
  if (/import it$/.test(lines[lines.length - 1])) return []
  const last = lines.findLastIndex(line => /^(hue |against the floor)/.test(line))
  return lines.slice(last + 1).map(line => `tile-stats: ${line}`)
}

/** The 25 L* rule for what was just imported: a surface through the rank's row, an object through its own art. */
const rankRule = async (tier: Difficulty, name: string, slot: string | undefined) => {
  const { inputs, reports } = await measureAll()
  console.table({ [tier]: rankRow(tier, inputs, reports) })
  const v = verdict(reports[tier], reports.master)
  const round = (n: number) => Math.round(n * 10) / 10
  if (slot === "face" || slot === "floor") {
    const faults = v.faceStep ? [] : [`face step ${round(reports[tier].faceStep)} L* (wants ${MIN_STEP})`]
    if (slot === "floor" && !v.prop) faults.push(`prop step ${round(reports[tier].prop)} L* (wants ${MIN_STEP})`)
    return faults
  }
  if (!["prop", "wall", "arch"].includes(slot ?? "")) return []
  const step = measureRank({ ...inputs[tier], prop: await artMean(tier, name) }).prop
  console.log(`${name} stands ${round(step)} L* off the ${tier} floor after the night`)
  return step >= MIN_STEP ? [] : [`${name} ${round(step)} L* off the floor (wants ${MIN_STEP})`]
}

/**
 * `yarn repaint <key> --land`: the newest image in ~/Downloads becomes the entry's master (seamless first
 * for a floor or a face), the entry's own import runs on it, and the result is measured to a verdict.
 */
export const land = async (entry: Entry): Promise<void> => {
  const plan = landPlan(entry)
  const download = newestImage(join(homedir(), "Downloads"))
  if (!download) throw new Error("No png, jpg or webp in ~/Downloads.")
  console.log(`${entry.key}: landing ${download}\n  as ${plan.master}\n`)

  const work = mkdtempSync(join(tmpdir(), "repaint-land-"))
  // The master the download replaces is put back if the import fails, so a bad landing costs nothing.
  const previous = existsSync(plan.master) ? join(work, "previous") : undefined
  if (previous) copyFileSync(plan.master, previous)
  try {
    const png = join(work, "master.png")
    await sharp(download).png().toFile(png)
    const fitted = await fitToBase(png, plan.base)
    if (fitted) console.log(fitted)
    if (plan.seamless) console.log(`seamless: ${await makeSeamless(png, plan.seamless)}`)
    mkdirSync(dirname(plan.master), { recursive: true })
    const master = sharp(png)
    await (
      plan.master.endsWith(".webp")
        ? master.webp({ quality: 95 })
        : /\.jpe?g$/.test(plan.master)
          ? master.jpeg({ quality: 95 })
          : master.png()
    ).toFile(plan.master)

    const vars = { OBJ: join(work, "obj.png"), SHADOW: join(work, "shadow.png") }
    for (const step of plan.steps) {
      if (step.kind === "yarn") execFileSync("yarn", substitute(step.args, vars), { stdio: "inherit" })
      else renderScaffold(step, vars.OBJ, vars.SHADOW)
    }
  } catch (error) {
    if (previous) copyFileSync(previous, plan.master)
    throw error
  } finally {
    rmSync(work, { recursive: true, force: true })
  }

  const tier = plan.tier as Difficulty | undefined
  if (!tier || !difficulties.includes(tier)) {
    console.log("\nNo rank to measure it against — look at it.")
    return
  }
  console.log("")
  const faults = [
    ...tileStats(plan.master, tier, plan.slot),
    ...(await rankRule(tier, plan.name ?? entry.key.split("/")[1], plan.slot)),
  ]
  console.log(`\n${faults.length === 0 ? "IMPORT" : `RE-ROLL — ${faults.join("; ")}`}`)
}
