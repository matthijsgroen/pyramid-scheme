export type Rect = { x: number; y: number; w: number; h: number }

/** Card geometry in QR modules; writer and reader share it, so no geometry travels in the image. */
export type CardLayout = {
  W: number
  H: number
  /** Top-left of each code's quiet zone. */
  cells: { x: number; y: number }[]
  /** Modules per side of one code. */
  size: number
  header: Rect
  footer: Rect
}

export const QUIET_ZONE = 4
export const BORDER = 7
const HEADER_SHARE = 0.24
const FOOTER_SHARE = 0.09

const qrSize = (version: number) => 17 + 4 * version

/**
 * Portrait card: codes in a ceil(√n)-column grid with the last row centred, a header band above
 * and a footer band below, all inside a border. Header and footer scale with the grid width.
 */
export const cardLayout = (n: number, version: number): CardLayout => {
  const size = qrSize(version)
  const cols = Math.ceil(Math.sqrt(n))
  const rows = Math.ceil(n / cols)
  const cell = size + 2 * QUIET_ZONE
  const gridW = cols * cell
  const gridH = rows * cell
  const headerH = Math.round(gridW * HEADER_SHARE)
  const footerH = Math.round(gridW * FOOTER_SHARE)
  const cells = Array.from({ length: n }, (_, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const inRow = row === rows - 1 ? n - cols * (rows - 1) : cols
    // whole modules, so a card drawn at an integer px/module keeps every module on the pixel grid
    const offset = Math.floor(((cols - inRow) * cell) / 2)
    return { x: BORDER + offset + col * cell, y: BORDER + headerH + row * cell }
  })
  return {
    W: gridW + 2 * BORDER,
    H: gridH + headerH + footerH + 2 * BORDER,
    cells,
    size,
    header: { x: BORDER, y: BORDER, w: gridW, h: headerH },
    footer: { x: BORDER, y: BORDER + headerH + gridH, w: gridW, h: footerH },
  }
}
