#!/usr/bin/env node
/**
 * Hands one entry of the repaint queue to the clipboard and its attachments to the Finder.
 *
 *   yarn repaint                 # list every key still owed
 *   yarn repaint junior/lamp     # prompt to the clipboard, both files revealed
 *   yarn repaint junior/lamp --check   # report only: no clipboard, no Finder
 *   yarn repaint junior/lamp --land    # newest image in ~/Downloads becomes the master, imported and measured
 *
 * The loop is manual on purpose: driving Gemini's web UI is against Google's terms and the API costs
 * money, so the prompt is pasted by hand. What that leaves worth automating is the fetching — finding the
 * right block in a 950-line document, and locating two files in a folder of two hundred renders.
 *
 * `--land` takes the newest png, jpg or webp in `~/Downloads` as the entry's master (the first path after
 * `yarn import-tile`, or `art/masters/props/<tier>/<name>.webp`), makes a floor seamless both ways and a
 * face along x, runs the entry's own import (its fenced `sh` block, scaffold renders included, or its
 * `**Import:**` line), then prints `tile-stats` and the rank's `rank-colour` row and ends on IMPORT, or
 * RE-ROLL with the failing number: a tile-stats fault, or a step under 25 L* off the floor.
 *
 * Two queues feed it, because the two kinds of art are owed in the same sense and a person with an hour
 * at the generator wants one list: `docs/instructions/repaint-queue.md` for tiles, and
 * `docs/game-design/story/character-art-prompts.md` for the story's people. Both are parsed rather than
 * copied, so a prompt edited there is the prompt that gets pasted.
 */

import { execFileSync } from "child_process"
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from "fs"
import { homedir } from "os"
import { join } from "path"
import { selectScript, stagedNames } from "./repaintReveal"
import { land } from "./repaintLandRun"
import { parse, type Entry } from "./repaintQueue"

const QUEUE = "docs/instructions/repaint-queue.md"
const CHARACTERS = "docs/game-design/story/character-art-prompts.md"
/** Attached to every character prompt: the style and scale both of them are drawn against. */
const ANCHOR = "src/assets/fez-250.png"

/** A blockquote's text, unquoted. One per entry, and one per preamble. */
const quoted = (block: string): string =>
  block
    .split("\n")
    .filter(line => line.startsWith(">"))
    .map(line => line.replace(/^>\s?/, ""))
    .join("\n")
    .trim()

/**
 * The character prompts, composed.
 *
 * That document states its preamble once and has every entry open with `[preamble]` — which is right for
 * reading it and useless for pasting it, so the token is substituted here. An entry whose file already
 * exists is not owed and does not appear; the queue is what is left to draw.
 *
 * **Attachments are the anchor plus the last file in the set that exists**, which is the loop the document
 * asks for: one at a time, and the accepted file becomes the reference for the next.
 *
 * An entry whose file exists is marked `drawn` rather than dropped: it leaves the owed list, and
 * `yarn repaint <key>` still hands it over. The explorer's three came back off-palette and had to be rolled
 * again, which is not a state a queue should have no way to express.
 *
 * A `**Re-roll:**` line puts a drawn entry BACK on the list with its reason beside it. Landing a file the
 * set cannot keep otherwise looks exactly like landing a good one, and the only thing tracking the
 * difference is whoever remembers — which is not a queue.
 */
const parseCharacters = (md: string): Entry[] => {
  const sections = md.split(/^## /m)
  const section = (n: string) => sections.find(s => s.startsWith(n)) ?? ""
  const preamble = quoted(section("0."))
  // The measured fills, so "cream cargo trousers" stops being the generator's to interpret.
  const palette = quoted(section("1.").split(/^### /m)[0])
  const ghostPreamble = quoted(section("2.").split(/^### /m)[0]).replace(/^\*\*Ghost preamble\*\*[^:]*:\s*/, "")
  const groups = [
    { group: "portrait", body: section("1.") },
    { group: "ghost", body: section("2.") },
  ]
  const drawn: Entry[] = []
  for (const { group, body } of groups)
    for (const block of body.split(/^### /m).slice(1)) {
      const file = /^`([\w-]+)-250\.png`/.exec(block)?.[1]
      if (!file) continue
      const name = file.replace(/^ghost-/, "")
      const out = join("src/assets", `${file}-250.png`)
      // An entry may name its own references in backticks; most want the default pair.
      const named = [...block.matchAll(/`((?:art|src)\/[^`]+\.(?:jpe?g|png))`/g)].map(m => m[1])
      const reroll = /\*\*Re-roll:\*\*\s*([^\n]+)/.exec(block)?.[1]?.trim()
      drawn.push({
        key: `${group}/${name}`,
        reroll,
        title: (block.split("\n")[0] ?? file).trim(),
        // Filled in below when the entry names none: the newest file that exists BEFORE it in this order.
        attachments: named,
        // The token is followed by the entry's own first sentence, so the break goes in with it: run
        // together, the preamble's last rule reads as part of the subject. Bold markers go — they are
        // for whoever reads the document, and the generator is handed plain text.
        prompt: quoted(block)
          .replace(/\[preamble \+ ghost preamble\]\s*/, `${preamble}\n\n${ghostPreamble}\n\n`)
          .replace(/\[preamble\]\s*/, `${preamble}\n\n`)
          .replace(/\[palette\]\s*/, palette ? `${palette}\n\n` : "")
          .replace(/\*\*/g, "")
          .trim(),
        out,
        master: join("art/masters/characters", `${file}.jpeg`),
        importedBy: `yarn import-portrait art/masters/characters/${file}.jpeg --name=${file}`,
      })
    }
  let reference: string | undefined
  const withReferences: Entry[] = []
  for (const entry of drawn) {
    const landed = existsSync(entry.out)
    const attachments = entry.attachments.length > 0 ? entry.attachments : [ANCHOR, ...(reference ? [reference] : [])]
    withReferences.push({ ...entry, attachments, drawn: landed })
    // Hand over the MASTER where there is one: the sprite is 250px wide, and a reference that small is
    // most of the detail gone before the generator sees it (art/README.md).
    if (landed) reference = entry.master && existsSync(entry.master) ? entry.master : entry.out
  }
  return withReferences
}

const entries = [...parse(readFileSync(QUEUE, "utf8")), ...parseCharacters(readFileSync(CHARACTERS, "utf8"))]
const wanted = process.argv[2]

/** Rank order, poorest tomb first, which is the order the ranks were painted in and the order the
 * sections of the queue are written in. Anything the pattern does not recognise sorts last rather than
 * being dropped — a listing that silently loses an entry is worse than one with an odd row in it. */
const TIERS = ["starter", "junior", "expert", "master", "wizard", "default"]

if (!wanted) {
  // GROUPED BY RANK, not in file order. The file is written in rank sections and used to list that way
  // for free, until the patron entries arrived: those are one section covering five ranks, because what
  // orders them is rooms rather than whose tomb they are. Working a rank at a time is how the ranks
  // actually get finished, and it is also how the material reference stays the same between pastes.
  const owed = entries.filter(e => !e.drawn || e.reroll)
  console.log(`${owed.length} prompts owed — \`yarn repaint <key>\` for one of:\n`)
  const rank = (key: string) => {
    const at = TIERS.indexOf(key.split("/")[0])
    return at < 0 ? TIERS.length : at
  }
  let last = ""
  for (const e of [...owed].sort((a, b) => rank(a.key) - rank(b.key))) {
    const tier = e.key.split("/")[0]
    if (tier !== last) console.log(`${last ? "\n" : ""}  ${tier}`)
    last = tier
    // The heading repeats the key, and under a rank header printing it twice more is noise: the column
    // gives the name and the rest of the line says what the thing is.
    const what = e.title.replace(/`/g, "").replace(/^\S+\s+—\s+/, "")
    console.log(`    ${(e.key.split("/")[1] ?? e.key).padEnd(22)} ${e.reroll ? `RE-ROLL: ${e.reroll}` : what}`)
  }
  process.exit(0)
}

const found = entries.filter(e => e.key === wanted || e.key.endsWith(`/${wanted}`))
if (found.length !== 1) {
  console.error(
    found.length === 0
      ? `No entry for "${wanted}". Run \`yarn repaint\` for the list.`
      : `"${wanted}" matches ${found.map(e => e.key).join(", ")} — name the rank too.`
  )
  process.exit(1)
}

const entry = found[0]
// --land is the other half of the loop: the download comes back, and this turns it into a measured tile.
if (process.argv.includes("--land")) {
  await land(entry)
  process.exit(0)
}
// --check reports and touches NOTHING — no clipboard, no Finder. It exists because the obvious way to
// audit the queue is to run this over every key, and doing that steals the desktop's focus once per
// entry and leaves the clipboard holding whichever prompt happened to be last. Fifty-two of those in a
// row is not a tolerable way to answer "which attachments are missing".
const check = process.argv.includes("--check")
if (!check) {
  // The clipboard is the point of the whole script; everything else is a convenience around it.
  execFileSync("pbcopy", { input: entry.prompt })
}
console.log(
  `${entry.key}${entry.drawn ? " (already drawn — this is a re-roll)" : ""} — ${
    check
      ? `${entry.prompt.split("\n").length} lines`
      : `prompt copied to the clipboard (${entry.prompt.split("\n").length} lines)`
  }\n`
)

const missing = entry.attachments.filter(p => !existsSync(p))
for (const p of entry.attachments) console.log(`  attach  ${p}${existsSync(p) ? "" : "   MISSING"}`)
if (missing.length > 0) {
  console.log(`\n${missing.length} missing — see "Regenerating the attachments" in ${QUEUE}.`)
} else if (!check && process.platform === "darwin" && entry.attachments.length > 0) {
  // Staged into a folder of their own, so the Finder can select them all in one window: the floor and the
  // scaffolds share ~/tile-previews, where a reveal selects one file among two hundred.
  const stage = join(homedir(), "tile-previews", "attach")
  rmSync(stage, { recursive: true, force: true })
  mkdirSync(stage, { recursive: true })
  const names = stagedNames(entry.attachments)
  entry.attachments.forEach((path, i) => copyFileSync(path, join(stage, names[i])))
  execFileSync("osascript", ["-e", selectScript(stage, names)!])
  console.log(`\nSelected in the Finder (${stage}) — drag them in, paste, and put the download in ~/Downloads.`)
}

console.log(`\nWhen it lands I import it and measure it; the file is ${entry.out}.`)
console.log(`  ${entry.importedBy}`)
