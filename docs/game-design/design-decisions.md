# Design Decisions

Durable record of cross-cutting decisions and their rationale — the "why" that
code and CHANGELOG don't capture. Append here when a decision spans multiple
files or would otherwise be re-litigated. For per-system detail see the other
`docs/game-design/` docs; for counts see `pyramid-interior-design.md §12`.

## Resolved

| Decision              | Resolution                                                                                                                                                                                                                    |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Save migration        | Hard reset on storage version bump — no migration code. See `world-stability.md`.                                                                                                                                             |
| Hieroglyphs           | **Fragment model** — `hieroglyphFragments: Record<id, count>` in `useProgression`; completion derived from count ≥ per-hieroglyph threshold (2–8 by tier × first-blocking tomb section; see `pyramid-interior-design.md §3`). |
| Map pieces            | Per-journey `foundMapPiece: boolean`; multi-tomb mapping authored in site config.                                                                                                                                             |
| Tomb keys (ward keys) | `tombKeys: Record<treasureId, true>` — boolean not count (each treasure unique).                                                                                                                                              |
| Mosaic pieces         | `mosaicPieces: string[]` — pyramid journey IDs. Reward total must equal reveal steps; see `game-loop.md`.                                                                                                                     |
| Exploration state     | `solvedEdges` / `exploredSections` per site in `useJourneys`.                                                                                                                                                                 |
| Entrance seal         | Number-grid re-solved every visit — no seal state.                                                                                                                                                                            |
| World generation      | Fixed seed, dev-time script → `src/data/generatedWorld.ts`; authored rules + seeded generator + global reachability solver. See `worldgen-dsl-redesign.md`.                                                                   |
| Tomb count            | 9 total (1+1+2+2+3); later tombs revealed by location-key treasure.                                                                                                                                                           |
| Tomb interiors        | Same site-map system as pyramids.                                                                                                                                                                                             |
| Consumable density    | 0 / 5 / 20 / 25 / 30 % per tier (starter→wizard); authored via DSL.                                                                                                                                                           |
| Path density vocab    | `none=0, low=1, medium=2–3, dense=4–5` paths per pyramid; same for `sidePaths` and `hiddenPaths`, composable and stacking.                                                                                                    |
| Trap rooms            | `RoomType: "trap"` — same nav as puzzle rooms, time-based; blocked at 1 half-heart (`canAttemptTrap()` = `currentHealth > 1`). See `pyramid-interior-design.md §11`.                                                          |
| Carry-forward         | Dropped — reintroduce only if a time-based puzzle family needs it.                                                                                                                                                            |

## Not yet built

- **Onboarding / first-encounter tutorials** — see `onboarding.md`.
- **Floor-key gates in world data** — gate type fully implemented in engine, zero uses in generated world (Storybook only). Add to expert+ pyramid configs when desired.
- **Per-pyramid site variation** — `generatedWorldConfigs` stores one `SiteConfig` per journey, not per pyramid. Would need `Record<string, SiteConfig[]>` (array per journey) to give distinct layouts within a journey.
- **Shortcut gates** — `maxBranchFactor` generates trees only; reconnecting branches deferred.
