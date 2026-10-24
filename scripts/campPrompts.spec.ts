import { describe, expect, it } from "vitest"
import { parseCamp } from "./campPrompts"

const MD = `# Camp art

## 0. The house style

> House style line one,
> line two.

**Edit preamble** (\`[edit]\` below):

> Edit the second image.

## 1. Fixed objects

### 1. \`camp/box\` — A box

Attach: \`art/masters/camp/anchor.webp\`

> [preamble] Paint **a box**.

### Fire pit (\`fire\`)

#### 2. \`camp/lid\` — Box, step 1 of 2

Edit of \`camp/box\`.

Attach: \`art/masters/camp/anchor.webp\`, \`art/masters/camp/box.webp\`

> [edit] Remove the lid.

### 3. \`camp/ground\` — Ground

Import with \`--key=none\`.

### 4. \`camp/strip\` — A wide strip

Import with \`--size=2048\`.

> [preamble] Paint a strip.

### 5. \`camp/box-b\` — A box, second frame

> [edit] Repaint only the flames.
`

describe("parseCamp", () => {
  const entries = parseCamp(MD)

  it("composes a camp entry from its preamble and edit preamble", () => {
    expect(entries.map(e => e.key)).toEqual(["camp/box", "camp/lid", "camp/ground", "camp/strip", "camp/box-b"])
    expect(entries[0].prompt).toBe("House style line one,\nline two.\n\nPaint a box.")
    expect(entries[1].prompt).toBe("Edit the second image.\n\nRemove the lid.")
    expect(entries[1].attachments).toEqual(["art/masters/camp/anchor.webp", "art/masters/camp/box.webp"])
    expect(entries[0].out).toBe("src/assets/camp/box.webp")
    expect(entries[0].master).toBe("art/masters/camp/box.webp")
    expect(entries[0].importedBy).toBe("yarn import-camp <file> --name=box")
  })

  it("asks for --key=none where the entry says so", () => {
    expect(entries[2].importedBy).toBe("yarn import-camp <file> --name=ground --key=none")
  })

  it("asks for a --size=N where the entry says so", () => {
    expect(entries[3].importedBy).toBe("yarn import-camp <file> --name=strip --size=2048")
  })

  it("takes a second frame's -b key as its own entry", () => {
    expect(entries[4].out).toBe("src/assets/camp/box-b.webp")
    expect(entries[4].importedBy).toBe("yarn import-camp <file> --name=box-b")
  })
})
