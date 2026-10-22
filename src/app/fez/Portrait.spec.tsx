// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { Portrait } from "./Portrait"
import type { PortraitArt } from "./portraits"

const art: PortraitArt = {
  src: "figure.png",
  alt: "A figure",
  face: "smile.png",
  painting: false,
  wide: undefined,
  drawn: { base: "default", face: "excited" },
}

const box = () => screen.getByRole("img").parentElement

describe("Portrait", () => {
  it("mirrors the explorer, so he faces the other speaker", () => {
    render(<Portrait speaker="explorer" art={art} />)

    expect(box()?.classList).toContain("-scale-x-100")
  })

  it("draws the explorer unmirrored when asked to", () => {
    render(<Portrait speaker="explorer" art={art} mirrored={false} />)

    expect(box()?.classList).not.toContain("-scale-x-100")
  })

  it("fades the dead", () => {
    render(<Portrait speaker="ipi" art={art} />)

    expect(box()?.classList).toContain("opacity-70")
  })

  it("shows only the art's own face of the faces it keeps mounted", () => {
    render(<Portrait speaker="fez" art={art} faces={["frown.png", "smile.png"]} />)

    const faces = [...document.querySelectorAll<HTMLImageElement>("img[data-face]")]
    expect(faces.filter(face => !face.classList.contains("invisible")).map(face => face.getAttribute("src"))).toEqual([
      "smile.png",
    ])
  })
})
