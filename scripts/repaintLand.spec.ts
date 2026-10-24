import { mkdirSync, mkdtempSync, readFileSync, utimesSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { describe, expect, it } from "vitest"
import sharp from "sharp"
import { fitToBase, landPlan, newestImage, seamlessAxis, substitute, words } from "./repaintLand"
import { parse, type Entry } from "./repaintQueue"

const folder = (files: Record<string, number>) => {
  const dir = mkdtempSync(join(tmpdir(), "repaint-land-spec-"))
  for (const [name, mtime] of Object.entries(files)) {
    const path = join(dir, name)
    if (name.endsWith("/")) mkdirSync(path)
    else writeFileSync(path, "")
    utimesSync(path, mtime, mtime)
  }
  return dir
}

describe("the newest download", () => {
  it("takes the most recently modified image", () => {
    const dir = folder({ "old.png": 1000, "new.webp": 3000, "mid.jpeg": 2000 })
    expect(newestImage(dir)).toBe(join(dir, "new.webp"))
  })

  it("passes over anything that is not an image, however new", () => {
    const dir = folder({ "gen.jpg": 1000, "notes.pdf": 5000, "partial.png.crdownload": 6000, "folder.png/": 7000 })
    expect(newestImage(dir)).toBe(join(dir, "gen.jpg"))
  })

  it("has nothing to land in a folder without images", () => {
    expect(newestImage(folder({ "notes.txt": 1000 }))).toBeUndefined()
  })
})

const entry = (extra: string): Entry =>
  parse(`### \`starter/madeUp\` — a made-up thing\n\n\`\`\`\nprompt\n\`\`\`\n\n${extra}`)[0]

describe("where a landing goes", () => {
  it("is the first path after import-tile on the Import line, with its slot and rank", () => {
    const plan = landPlan(
      entry(
        "**Import:** `yarn import-tile art/masters/surfaces/x.webp --tier=junior --name=floor --slot=floor --repeat=2`"
      )
    )
    expect(plan).toMatchObject({ master: "art/masters/surfaces/x.webp", tier: "junior", name: "floor", slot: "floor" })
    expect(plan.steps).toEqual([
      {
        kind: "yarn",
        args: [
          "import-tile",
          "art/masters/surfaces/x.webp",
          "--tier=junior",
          "--name=floor",
          "--slot=floor",
          "--repeat=2",
        ],
      },
    ])
  })

  it("falls back to the rank's prop folder without an Import line", () => {
    const plan = landPlan(entry(""))
    expect(plan).toMatchObject({ master: "art/masters/props/starter/madeUp.webp", slot: "prop" })
    expect(plan.steps[0].args).toContain("art/masters/props/starter/madeUp.webp")
  })

  it("runs a fenced sh block's scaffold before its import, continuation lines joined", () => {
    const plan = landPlan(
      entry(
        '```sh\nscaffold shelf --spin=-12\nyarn import-tile art/masters/props/starter/a.webp --tier=starter --name=a --slot=prop \\\n  --filter=smooth --mask="$OBJ" --seat="$SHADOW"\n```'
      )
    )
    expect(plan.master).toBe("art/masters/props/starter/a.webp")
    expect(plan.steps.map(s => s.kind)).toEqual(["scaffold", "yarn"])
    expect(plan.steps[0].args).toEqual(["shelf", "--spin=-12"])
    expect(plan.steps[1].args.slice(-2)).toEqual(["--mask=$OBJ", "--seat=$SHADOW"])
  })

  it("lands a portrait at its own master", () => {
    const plan = landPlan({
      ...entry(""),
      key: "portrait/someone",
      importedBy: "yarn import-portrait art/masters/characters/someone.jpeg --name=someone",
    })
    expect(plan).toMatchObject({ master: "art/masters/characters/someone.jpeg", tier: undefined })
  })

  it("lands a master-only entry at its master and imports nothing", () => {
    const plan = landPlan({
      ...entry(""),
      key: "portrait/someone-proof",
      masterOnly: true,
      master: "art/masters/characters/someone-proof.jpeg",
      importedBy: "nothing — master only",
    })
    expect(plan).toEqual({ master: "art/masters/characters/someone-proof.jpeg", steps: [] })
  })
})

describe("an edit lands at its master's size", () => {
  const edit = (attachments: string[]): Entry => ({
    ...entry(""),
    key: "portrait/someone-face-x",
    masterOnly: true,
    master: "art/masters/characters/someone-face-x.jpeg",
    attachments,
  })

  it("takes its base from the first attachment among the character masters", () => {
    const plan = landPlan(
      edit(["src/assets/someone-250.png", "art/masters/characters/someone.jpeg", "art/masters/characters/other.jpeg"])
    )
    expect(plan.base).toBe("art/masters/characters/someone.jpeg")
  })

  it("has no base when nothing it attaches is a character master", () => {
    expect(landPlan(edit(["src/assets/someone-250.png"])).base).toBeUndefined()
  })

  const image = async (dir: string, name: string, width: number, height: number) => {
    const path = join(dir, name)
    await sharp({ create: { width, height, channels: 3, background: "#808080" } })
      .png()
      .toFile(path)
    return path
  }
  const size = async (path: string) => {
    const { width, height } = await sharp(path).metadata()
    return `${width}x${height}`
  }

  it("scales a download of another size to the base's exact size, both axes", async () => {
    const dir = mkdtempSync(join(tmpdir(), "repaint-fit-spec-"))
    const base = await image(dir, "someone.jpeg", 40, 60)
    const download = await image(dir, "download.png", 41, 59)

    expect(await fitToBase(download, base)).toBe("scaled 41x59 → 40x60 to match someone.jpeg")
    expect(await size(download)).toBe("40x60")
  })

  it("leaves a download of the base's size untouched", async () => {
    const dir = mkdtempSync(join(tmpdir(), "repaint-fit-spec-"))
    const base = await image(dir, "someone.jpeg", 40, 60)
    const download = await image(dir, "download.png", 40, 60)
    const before = readFileSync(download)

    expect(await fitToBase(download, base)).toBeUndefined()
    expect(readFileSync(download).equals(before)).toBe(true)
  })

  it("leaves a download untouched without a base, or with one not on disk", async () => {
    const dir = mkdtempSync(join(tmpdir(), "repaint-fit-spec-"))
    const download = await image(dir, "download.png", 41, 59)

    expect(await fitToBase(download, undefined)).toBeUndefined()
    expect(await fitToBase(download, join(dir, "missing.jpeg"))).toBeUndefined()
    expect(await size(download)).toBe("41x59")
  })
})

describe("a whole-wall panel", () => {
  const panel = entry("**Import:** `yarn import-panel art/masters/tombWall/junior.webp --tier=junior`")

  it("lands at the master its import-panel line names, graded as a panel and never wrapped", () => {
    expect(landPlan(panel)).toMatchObject({
      master: "art/masters/tombWall/junior.webp",
      tier: "junior",
      slot: "panel",
      seamless: undefined,
    })
  })

  it("is shipped as the rank's tomb wall, not as a map tile", () => {
    expect(panel.out).toBe("src/assets/tombWall/junior.webp")
  })
})

describe("seamless", () => {
  it("wraps a floor both ways, a face along x, and nothing with a shape", () => {
    expect(seamlessAxis("floor")).toBe("both")
    expect(seamlessAxis("face")).toBe("x")
    expect(seamlessAxis("sill")).toBeUndefined()
    expect(seamlessAxis("prop")).toBeUndefined()
    expect(seamlessAxis("panel")).toBeUndefined()
    expect(seamlessAxis(undefined)).toBeUndefined()
  })
})

describe("command words", () => {
  it("drops quotes and keeps variables for substitution", () => {
    const args = words(`yarn x --a="b c" '--d=$OBJ'`)
    expect(args).toEqual(["yarn", "x", "--a=b c", "--d=$OBJ"])
    expect(substitute(args, { OBJ: "/tmp/o.png" })).toEqual(["yarn", "x", "--a=b c", "--d=/tmp/o.png"])
  })
})
