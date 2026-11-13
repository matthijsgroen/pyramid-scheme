import type { PadBrand } from "@/ui/atoms/glyphs"

// Sony's USB vendor id ("Vendor: 054c" in Chrome, "054c-…" in Firefox), and the names a browser without it gives.
// "Wireless Controller" is Sony's own name only at the start: Xbox pads are "Xbox Wireless Controller".
const PLAYSTATION = /054c|dualsense|dualshock|^wireless controller|playstation/i

/** The brand of pad a `Gamepad.id` names. A pad nothing here recognises wears the Xbox look. */
export const padBrandOf = (id: string): PadBrand => (PLAYSTATION.test(id) ? "playstation" : "xbox")
