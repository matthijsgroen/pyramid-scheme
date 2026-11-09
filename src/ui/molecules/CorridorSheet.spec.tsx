// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { CorridorSheet } from "./CorridorSheet"

const base = { parts: { held: 4, total: 4 }, partsLabel: "parts", inPyramid: "in pyramid" }

describe("CorridorSheet", () => {
  it("names the journeys where a corridor waits", () => {
    render(
      <CorridorSheet
        {...base}
        journeys={{ heading: "where", none: "none", rows: [{ key: "a", label: "Bastet", detail: "Pyramid 2 · 2" }] }}
      />
    )
    expect(screen.getByText("Bastet")).toBeTruthy()
    expect(screen.getByText("Pyramid 2 · 2")).toBeTruthy()
  })

  it("says so when no journey been to has one", () => {
    render(<CorridorSheet {...base} journeys={{ heading: "where", none: "none", rows: [] }} />)
    expect(screen.getByText("none")).toBeTruthy()
  })

  it("names no journey before it hears that far", () => {
    render(<CorridorSheet {...base} parts={{ held: 3, total: 4 }} next="next" />)
    expect(screen.queryByText("where")).toBeNull()
  })
})
