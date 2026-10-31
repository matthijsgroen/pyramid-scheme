import { modEntrances, type ModEntrance } from "./modEntrances"

const noLabel = (): { label: string; badge?: number } => ({ label: "" })

// The mod entrance that claims the camp window, with its label and badge read now; none when no mod
// claims it, so the window stays bare. The registry is filled once at module load, so the hook below
// runs in the same order every render.
export const useWindowEntrance = (): { entrance: ModEntrance; label: string; badge?: number } | undefined => {
  const entrance = modEntrances().find(e => e.object === "window")
  const useLabel = entrance?.useLabel ?? noLabel
  const { label, badge } = useLabel()
  return entrance && { entrance, label, badge }
}
