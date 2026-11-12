import type { TFunction } from "i18next"
import fezLogo from "@/assets/fez-logo.png"
import masonryStone from "@/assets/masonry-stone.png"
import { BORDER, cardLayout, QUIET_ZONE, type CardLayout } from "./cardLayout"
import { encodeChunks, rasterCodes, type RgbaImage } from "./rasterCodes"

const LONG_SIDE = 2_000
const FONT = `Limelight, "Pyramid Greek", "Pyramid Cyrillic", serif`
const INK = "#2b2118"
const GOLD = "#e0a526"
const SUN = "#ffd27a"
const PAPER = "#fff8ea"
const SANDSTONE = "#d6b98a"
const SHADOW = "rgba(43, 33, 24, 0.35)"

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })

const clock = (date: Date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`

/** A gold rule inside the ink border. */
const drawBorder = (g: CanvasRenderingContext2D, width: number, height: number, border: number) => {
  const outer = border * 0.45
  const inner = border * 0.6
  g.fillStyle = GOLD
  g.beginPath()
  g.rect(outer, outer, width - 2 * outer, height - 2 * outer)
  g.rect(inner, inner, width - 2 * inner, height - 2 * inner)
  g.fill("evenodd")
}

/** Dusk sky, sun, two pyramids on a red ground line, the Fez logo, the title and the subtitle. */
const drawHeader = (
  g: CanvasRenderingContext2D,
  layout: CardLayout,
  px: number,
  fez: HTMLImageElement,
  subtitle: string,
  title: string
) => {
  const x = layout.header.x * px
  const y = layout.header.y * px
  const w = layout.header.w * px
  const h = layout.header.h * px
  const base = y + h

  g.save()
  g.beginPath()
  g.rect(x, y, w, h)
  g.clip()
  const sky = g.createLinearGradient(0, y, 0, base)
  sky.addColorStop(0, "#27304a")
  sky.addColorStop(0.7, "#a3401a")
  sky.addColorStop(1, GOLD)
  g.fillStyle = sky
  g.fillRect(x, y, w, h)
  g.fillStyle = SUN
  g.beginPath()
  g.arc(x + w - h * 0.75, y + h * 0.42, h * 0.11, 0, 2 * Math.PI)
  g.fill()
  const pyramid = (cx: number, pw: number, ph: number, light: string, dark: string) => {
    g.fillStyle = light
    g.beginPath()
    g.moveTo(cx - pw / 2, base)
    g.lineTo(cx, base - ph)
    g.lineTo(cx, base)
    g.fill()
    g.fillStyle = dark
    g.beginPath()
    g.moveTo(cx, base - ph)
    g.lineTo(cx + pw / 2, base)
    g.lineTo(cx, base)
    g.fill()
  }
  pyramid(x + w - h * 0.55, h * 0.8, h * 0.4, "#c2915a", "#855a0c")
  pyramid(x + w - h * 1.15, h * 1.15, h * 0.58, "#eab54b", "#b87f14")
  g.fillStyle = "#c25e30"
  g.fillRect(x, base - h * 0.06, w, h * 0.06)
  g.restore()

  g.drawImage(fez, x + h * 0.12, y + h * 0.1, h * 0.84, h * 0.84)

  const textX = x + h * 1.04
  const fit = (text: string, size: number, room: number) => {
    g.font = `100px ${FONT}`
    return Math.min(size, (100 * room) / g.measureText(text).width)
  }
  g.textBaseline = "alphabetic"
  g.textAlign = "left"
  // the title stays clear of the sun; the subtitle may run over the pyramids
  g.font = `${fit(title, h * 0.34, w - h * 2.3)}px ${FONT}`
  g.fillStyle = INK
  g.fillText(title, textX + h * 0.02, y + h * 0.53)
  g.fillStyle = SUN
  g.fillText(title, textX, y + h * 0.5)
  g.font = `${fit(subtitle, h * 0.14, x + w - textX - h * 0.12)}px ${FONT}`
  g.fillStyle = PAPER
  g.fillText(subtitle, textX + h * 0.02, y + h * 0.74)
}

/** Sandstone with masonry under the codes' shadows, "valid until" on the left and the code count on the right. */
const drawFooter = (
  g: CanvasRenderingContext2D,
  layout: CardLayout,
  px: number,
  stone: HTMLImageElement,
  left: string,
  right: string
) => {
  const x = layout.footer.x * px
  const y = layout.footer.y * px
  const w = layout.footer.w * px
  const h = layout.footer.h * px

  g.save()
  g.beginPath()
  g.rect(x, y, w, h)
  g.clip()
  g.fillStyle = SANDSTONE
  g.fillRect(x, y, w, h)
  g.globalAlpha = 0.35
  g.translate(x, y)
  g.scale(px / 3, px / 3)
  g.fillStyle = g.createPattern(stone, "repeat") ?? SANDSTONE
  g.fillRect(0, 0, (w * 3) / px, (h * 3) / px)
  g.restore()

  // the codes cast a shadow down and to the right; only the part falling on the footer is drawn
  g.save()
  g.beginPath()
  g.rect(x, y, w, h)
  g.clip()
  g.fillStyle = SHADOW
  const cell = (layout.size + 2 * QUIET_ZONE) * px
  for (const c of layout.cells) g.fillRect(c.x * px + px * 0.8, c.y * px + px * 0.8, cell, cell)
  g.restore()

  g.fillStyle = INK
  g.textBaseline = "middle"
  g.font = `${h * 0.38}px ${FONT}`
  g.textAlign = "left"
  g.fillText(left, x + px * QUIET_ZONE, y + h * 0.5)
  g.textAlign = "right"
  g.fillText(right, x + w - px * QUIET_ZONE, y + h * 0.5)
}

/**
 * The travel card as a PNG: the codes from `rasterCodes`, and the decoration drawn around them on the
 * header, footer and border only, so the reader sees the codes and their quiet zones untouched.
 */
export const drawCard = async (chunks: Uint8Array[], validUntil: Date, t: TFunction): Promise<Blob> => {
  const { version, matrices } = await encodeChunks(chunks)
  const layout = cardLayout(chunks.length, version)
  const px = Math.max(2, Math.round(LONG_SIDE / Math.max(layout.W, layout.H)))
  const bare = rasterCodes(layout, matrices, px)
  const [fez, stone] = await Promise.all([
    loadImage(fezLogo),
    loadImage(masonryStone),
    document.fonts.load(`80px ${FONT}`),
  ])

  const canvas = document.createElement("canvas")
  canvas.width = bare.width
  canvas.height = bare.height
  const g = canvas.getContext("2d")
  if (!g) throw new Error("No 2D canvas")
  g.putImageData(new ImageData(bare.data as Uint8ClampedArray<ArrayBuffer>, bare.width, bare.height), 0, 0)
  drawBorder(g, bare.width, bare.height, BORDER * px)
  drawHeader(g, layout, px, fez, t("saveCard.subtitle"), t("saveCard.cardTitle"))
  drawFooter(
    g,
    layout,
    px,
    stone,
    t("saveCard.validUntil", { time: clock(validUntil) }),
    t("saveCard.codes", { count: chunks.length })
  )

  return new Promise((resolve, reject) =>
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error("Card did not encode"))), "image/png")
  )
}

/** The pixels of an image file, at its own size. */
export const imageFromFile = async (file: Blob): Promise<RgbaImage> => {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement("canvas")
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const g = canvas.getContext("2d", { willReadFrequently: true })
  if (!g) throw new Error("No 2D canvas")
  g.drawImage(bitmap, 0, 0)
  bitmap.close()
  return g.getImageData(0, 0, canvas.width, canvas.height)
}
