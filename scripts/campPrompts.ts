import { existsSync } from "fs"
import { join } from "path"
import type { Entry } from "./repaintQueue"

/** A blockquote's text, unquoted. */
const quoted = (block: string): string =>
  block
    .split("\n")
    .filter(line => line.startsWith(">"))
    .map(line => line.replace(/^>\s?/, ""))
    .join("\n")
    .trim()

/**
 * The camp prompts, composed.
 *
 * §0 of the document states the house preamble and the edit preamble once; an entry opens with
 * `[preamble]` or `[edit]`, which is right for reading it and useless for pasting it, so the token is
 * substituted here. Only headings carrying a `camp/<id>` key are entries: the section headings that group
 * a spot's steps have none.
 *
 * An entry is `drawn` once its shipped file exists, which takes it off the owed list.
 */
export const parseCamp = (md: string): Entry[] => {
  const [, ...afterStyle] = md.split(/^## 0\..*$/m)
  const style = (afterStyle[0] ?? "").split(/^## /m)[0]
  const [housePart, editPart = ""] = style.split(/^\*\*Edit preamble\*\*.*$/m)
  const preamble = quoted(housePart)
  const edit = quoted(editPart)

  return md
    .split(/^###{1,2} /m)
    .slice(1)
    .flatMap(block => {
      const id = /^\d+\.\s+`camp\/([A-Za-z0-9-]+)`/.exec(block)?.[1]
      if (!id) return []
      const attachLine = /^Attach:(.*)$/m.exec(block)?.[1] ?? ""
      const attachments = [...attachLine.matchAll(/`(art\/[^`]+)`/g)].map(m => m[1])
      const out = join("src/assets/camp", `${id}.webp`)
      const noKey = /Import with `--key=none`/.test(block)
      return [
        {
          key: `camp/${id}`,
          title: (block.split("\n")[0] ?? id).replace(/^\d+\.\s+`[^`]+`\s+—\s+/, "").trim(),
          attachments,
          prompt: quoted(block)
            .replace(/\[preamble\]\s*/, `${preamble}\n\n`)
            .replace(/\[edit\]\s*/, `${edit}\n\n`)
            .replace(/\*\*/g, "")
            .trim(),
          out,
          master: join("art/masters/camp", `${id}.webp`),
          importedBy: `yarn import-camp <file> --name=${id}${noKey ? " --key=none" : ""}`,
          drawn: existsSync(out),
        },
      ]
    })
}
