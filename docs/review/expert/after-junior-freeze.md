# Expert: after the junior freeze

Work the expert-prep session could not do while the junior carve was not yet frozen: each item needs a bake or a
change in `src/worldGen/`. Check `src/data/juniorCarve.json` on main before starting.

- [ ] Walk: Piramide van Djoser (expert_4) level 4, `buildersLift`, side paths in the lock's corridors.
- [ ] **hourglass reshape** (designer: every lock unique; hourglass and highWater were near-twins, both one lever
      and two opposite halls with the exit wanting something from each). Swap `src/game/locks/expert/hourglass.lock`
      for the version below (`yarn lock hourglass`: 5 actions, every piece bears load), set its realisations in
      `src/worldGen/spec/locks/onFloor.ts` to `{ toggle: "handle", weights: "stonePlate", pipe: "stonePipe",
    "region-barrier": "sand" }`, update its row in `docs/game-design/lock-curriculum.md` (it leaves the torch row,
      joins the stones and pipe rows), and re-bake: it stands on expert_2 pyramid 4.

```
// designed by: Claude
// expert. An hourglass: one lever buries one hall in sand and clears the other. The stone lies in the west hall,
// its plate in the east, and the lever stands behind a passage no stone is carried through: post the stone
// through the pipe under the glass, then turn it.

in -- hall
hall -[p]- out
hall -- west
hall -- east
hall -[unladen]- glass
west -[S:a]
east -[S:b]
S toggle @glass
pile plate @west stone
p plate @east
P pipe @west @east
```
