import { type FC, useEffect, useState } from "react"

// Art painted for a scene stands where it stands in that scene, often in a corner of a wide transparent
// canvas. Shown alone (a loot popup), only the painted part should fill the frame: this draws the image cut
// to the box of its visible pixels. Until that box is known, and wherever a canvas is unavailable, the
// whole image is shown.
const trimmed = new Map<string, Promise<string | undefined>>()

const ALPHA_FLOOR = 8

const trimToContent = (src: string): Promise<string | undefined> => {
  const known = trimmed.get(src)
  if (known) return known
  const work = new Promise<string | undefined>(resolve => {
    const img = new Image()
    img.onerror = () => resolve(undefined)
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext("2d")
      if (!ctx || canvas.width === 0) return resolve(undefined)
      ctx.drawImage(img, 0, 0)
      const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height)
      let [left, top, right, bottom] = [width, height, -1, -1]
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++)
          if (data[(y * width + x) * 4 + 3] > ALPHA_FLOOR) {
            if (x < left) left = x
            if (x > right) right = x
            if (y < top) top = y
            if (y > bottom) bottom = y
          }
      if (right < 0) return resolve(undefined)
      const out = document.createElement("canvas")
      out.width = right - left + 1
      out.height = bottom - top + 1
      out.getContext("2d")?.drawImage(canvas, left, top, out.width, out.height, 0, 0, out.width, out.height)
      resolve(out.toDataURL())
    }
    img.src = src
  })
  trimmed.set(src, work)
  return work
}

export const TrimmedPicture: FC<{ src: string; className?: string }> = ({ src, className }) => {
  const [cut, setCut] = useState<{ src: string; url: string } | undefined>()
  useEffect(() => {
    let live = true
    void trimToContent(src).then(url => {
      if (live && url) setCut({ src, url })
    })
    return () => {
      live = false
    }
  }, [src])
  return (
    <img
      src={cut?.src === src ? cut.url : src}
      alt=""
      draggable={false}
      className={`object-contain ${className ?? ""}`}
    />
  )
}
