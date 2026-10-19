import { homedir } from "os"
import { join } from "path"

export type Entry = {
  key: string
  title: string
  attachments: string[]
  prompt: string
  /** Where the finished file goes, and what turns the download into it. */
  out: string
  importedBy: string
  /** Already on disk. Off the owed list, still fetchable by key — a landed file can need rolling again. */
  drawn?: boolean
  /** Why the landed file is not good enough. Set by a `**Re-roll:**` line, and puts it BACK on the list. */
  reroll?: string
  /** The generator return this was imported from, kept because it cannot be generated again. */
  master?: string
  /** A prop's fenced `sh` block: the `scaffold` that renders its mask and shadow, then its import. */
  importScript?: string
}

/** Every `### n. \`tier/kind\` — title` block, with its attachment list and its first fenced block. */
export const parse = (md: string): Entry[] =>
  md
    .split(/^### /m)
    .slice(1)
    // An entry ends where its section does: the next `## ` intro names files that are not its attachments.
    .map(block => block.split(/^## /m)[0])
    .flatMap(block => {
      const key = /`([a-z]+\/[A-Za-z0-9-]+)`/.exec(block)?.[1]
      const prompt = /```\n([\s\S]*?)\n```/.exec(block)?.[1]
      if (!key || !prompt) return []
      // A render in `~/tile-previews`, or a master kept in the repo (an edit of a painted tile attaches that).
      // An entry that is not a prop (the explorer's sheet) gives its own `**Import:**` line, whose paths
      // are outputs and so never attachments.
      const importLine = /^\*\*Import:\*\*\s*`([^`]+)`/m.exec(block)?.[1]
      const outputs = importLine?.split(/\s+/) ?? []
      const importScript = /```sh\n([\s\S]*?)\n```/.exec(block)?.[1]
      const attachments = [...block.matchAll(/`((?:~\/[^`]+\.png|art\/masters\/[^`]+\.(?:webp|png|jpe?g)))`/g)]
        .map(m => m[1])
        .filter(path => !outputs.includes(path))
        .map(path => path.replace(/^~/, homedir()))
      return [
        {
          key,
          title: (block.split("\n")[0] ?? key).trim(),
          attachments,
          prompt,
          // A whole-wall panel is not a map tile: it lands as the rank's tableau wall.
          out: importLine?.startsWith("yarn import-panel ")
            ? join("src/assets/tombWall", `${/--tier=(\w+)/.exec(importLine)?.[1]}.webp`)
            : join("src/assets/tiles", key.split("/")[0], `${key.split("/")[1]}.png`),
          importedBy:
            importLine ?? `yarn import-tile <file> --tier=${key.split("/")[0]} --name=${key.split("/")[1]} --slot=prop`,
          importScript,
        },
      ]
    })
