import type { HaulLine } from "@/app/home/haulLines"

// A waterskin is drunk on pickup, so nothing of it comes home to show.
export const summariseWaterskins = (): HaulLine[] => []

export const useTrapHaulLines = () => ({ waterskin: summariseWaterskins })
