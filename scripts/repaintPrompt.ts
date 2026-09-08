#!/usr/bin/env node
/**
 * Hands one entry of the repaint queue to the clipboard and its attachments to the Finder.
 *
 *   yarn repaint                 # list every key still owed
 *   yarn repaint junior/lamp     # prompt to the clipboard, both files revealed
 *
 * The loop is manual on purpose: driving Gemini's web UI is against Google's terms and the API costs
 * money, so the prompt is pasted by hand. What that leaves worth automating is the fetching — finding the
 * right block in a 950-line document, and locating two files in a folder of two hundred renders.
 *
 * `docs/instructions/repaint-queue.md` is the single source: this parses it rather than holding a second
 * copy of anything, so a prompt edited there is the prompt that gets pasted.
 */

import { execFileSync } from "child_process"
import { existsSync, readFileSync } from "fs"
import { homedir } from "os"
import { join } from "path"

const QUEUE = "docs/instructions/repaint-queue.md"

type Entry = { key: string; title: string; attachments: string[]; prompt: string }

/** Every `### n. \`tier/kind\` — title` block, with its attachment list and its first fenced block. */
const parse = (md: string): Entry[] =>
  md
    .split(/^### /m)
    .slice(1)
    .flatMap(block => {
      const key = /`([a-z]+\/[A-Za-z0-9-]+)`/.exec(block)?.[1]
      const prompt = /```\n([\s\S]*?)\n```/.exec(block)?.[1]
      if (!key || !prompt) return []
      const attachments = [...block.matchAll(/`(~\/[^`]+\.png)`/g)].map(m => m[1].replace("~", homedir()))
      return [{ key, title: (block.split("\n")[0] ?? key).trim(), attachments, prompt }]
    })

const entries = parse(readFileSync(QUEUE, "utf8"))
const wanted = process.argv[2]

if (!wanted) {
  console.log(`${entries.length} prompts owed — \`yarn repaint <key>\` for one of:\n`)
  for (const e of entries) console.log(`  ${e.key.padEnd(26)} ${e.title.replace(/`/g, "")}`)
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
// The clipboard is the point of the whole script; everything else is a convenience around it.
execFileSync("pbcopy", { input: entry.prompt })
console.log(`${entry.key} — prompt copied to the clipboard (${entry.prompt.split("\n").length} lines)\n`)

const missing = entry.attachments.filter(p => !existsSync(p))
for (const p of entry.attachments) console.log(`  attach  ${p}${existsSync(p) ? "" : "   MISSING"}`)
if (missing.length > 0) {
  console.log(`\n${missing.length} missing — see "Regenerating the attachments" in ${QUEUE}.`)
} else if (process.platform === "darwin") {
  // -R reveals rather than opens: a revealed file can be dragged straight into the browser, where an
  // opened one is a Preview window in the way.
  execFileSync("open", ["-R", ...entry.attachments])
  console.log("\nBoth revealed in the Finder — drag them in, paste, and put the download in ~/Downloads.")
}

const out = join("src/assets/tiles", entry.key.split("/")[0], `${entry.key.split("/")[1]}.png`)
console.log(`\nWhen it lands I import it and measure it; the tile is ${out}.`)
