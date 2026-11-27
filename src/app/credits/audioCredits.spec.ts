import { existsSync, readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { creditSchema } from "./audioCredits"

const AUDIO_DIR = path.resolve(import.meta.dirname, "../../assets/audio")
const AUDIO = /\.(mp3|aac|m4a|ogg|opus|wav)$/
const CREDIT = /\.credit\.json$/

const filesIn = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
        entry.isDirectory() ? filesIn(path.join(dir, entry.name)) : [path.join(dir, entry.name)]
      )
    : []

const files = filesIn(AUDIO_DIR)
const audioFiles = files.filter(file => AUDIO.test(file))
const creditFiles = files.filter(file => CREDIT.test(file))
const stem = (file: string) => file.replace(AUDIO, "").replace(CREDIT, "")

describe("audio credits", () => {
  it("every audio file has a credit file next to it", () => {
    expect(audioFiles.filter(file => !existsSync(`${stem(file)}.credit.json`))).toEqual([])
  })

  it("every credit file names an audio file that exists", () => {
    const stems = new Set(audioFiles.map(stem))
    expect(creditFiles.filter(file => !stems.has(stem(file)))).toEqual([])
  })

  it("every credit file has a title, author, source URL and licence", () => {
    for (const file of creditFiles) {
      const parsed = creditSchema.safeParse(JSON.parse(readFileSync(file, "utf8")))
      expect(parsed.success, `${path.relative(AUDIO_DIR, file)}: ${parsed.error?.message}`).toBe(true)
    }
  })
})
