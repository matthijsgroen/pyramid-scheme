import { describe, expect, it } from "vitest"
import sharp from "sharp"
import { campLook, lab } from "./campLook"

/** Sky above the horizon, ground below it; a disc of `disc` colour in the ground. */
const scene = async ({ sky, ground, disc }: { sky: string; ground: string; disc: string }) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="200">
    <rect width="100" height="50" fill="${sky}"/>
    <rect y="50" width="100" height="150" fill="${ground}"/>
    <circle cx="50" cy="150" r="20" fill="${disc}"/>
  </svg>`
  const { data, info } = await sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  return { data, width: info.width, height: info.height, channels: info.channels }
}

describe("lab", () => {
  it("gives white L* 100 and no chroma, black L* 0", () => {
    expect(lab(255, 255, 255).L).toBeCloseTo(100, 0)
    expect(lab(255, 255, 255).C).toBeCloseTo(0, 0)
    expect(lab(0, 0, 0).L).toBeCloseTo(0, 5)
  })

  it("gives pure sRGB red its reference L* 53.2 and C* 104.6", () => {
    expect(lab(255, 0, 0).L).toBeCloseTo(53.2, 0)
    expect(lab(255, 0, 0).C).toBeCloseTo(104.6, 0)
  })
})

describe("campLook", () => {
  it("measures only the ground below the horizon, never the sky", async () => {
    const image = await scene({ sky: "#ff0000", ground: "#808080", disc: "#808080" })
    const look = campLook(image, { horizon: 0.25, fire: { x: 0.5, y: 0.75, r: 0.2 } })
    expect(look.ground.C).toBeCloseTo(0, 0)
    expect(look.ground.L).toBeCloseTo(lab(128, 128, 128).L, 1)
    expect(look.ground.vivid).toBe(0)
  })

  it("counts the share of ground pixels with C* over 40", async () => {
    const image = await scene({ sky: "#000000", ground: "#808080", disc: "#ff8000" })
    const look = campLook(image, { horizon: 0.25, fire: { x: 0.5, y: 0.75, r: 0.2 } })
    const discShare = (Math.PI * 20 * 20) / (100 * 150)
    expect(look.ground.vivid).toBeCloseTo(discShare, 2)
  })

  it("measures the fire disc as given in shares of width and height", async () => {
    const image = await scene({ sky: "#000000", ground: "#808080", disc: "#ff8000" })
    const look = campLook(image, { horizon: 0.25, fire: { x: 0.5, y: 0.75, r: 0.15 } })
    expect(look.fire.L).toBeCloseTo(lab(255, 128, 0).L, 0)
    expect(look.fire.C).toBeCloseTo(lab(255, 128, 0).C, 0)
  })
})
