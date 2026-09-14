# Arc — An Offering to the Gods

Written to `FORMAT.md`. **Everything here is `sketch` unless a row says otherwise**, and the addresses are
illustrations of the format rather than chosen places — they show what a `placed` row looks like.

## 1. Premise

To speak to the gods you must be announced, and only a priest may announce you. The priest will do it for a
proper offering — and a proper offering means a thing a pharaoh was buried holding. So: reach the gods at
wizard, which needs an offering made at an expert priest's table, which needs an item out of a master tomb.
The chain runs backwards through the tiers, which is how it uses the one thing this world does that others
do not — old places reopening once you are strong enough to come back.

Tone: a cheerful expedition that keeps turning out to be more serious than the people in it think.

## 2. Cast

| id       | who                                                  | where they speak             | voice                                                   | status |
| -------- | ---------------------------------------------------- | ---------------------------- | ------------------------------------------------------- | ------ |
| `fez`    | the travelling merchant, already in the game         | arrival, link completion     | cheerful, commercial, increasingly uneasy (§3.4 Part 3) | sketch |
| `priest` | keeper of the offering table; never seen, only heard | link completion at `p_altar` | formal, unimpressed, briefly delighted                  | sketch |

The priest is deliberately a _voice at a place_, not a character with a scene — the game has no surface for
a scene, and inventing one is the most expensive thing this arc could accidentally ask for.

## 3. Props

| id            | what it is                                              | drawn / written | currency? | status |
| ------------- | ------------------------------------------------------- | --------------- | --------- | ------ |
| `seal_true`   | a pharaoh's burial seal — the real offering             | drawn           | **yes**   | sketch |
| `seal_false`  | the same seal, a copy, convincing                       | drawn           | **no**    | sketch |
| `rite`        | the priest's token that you have been announced         | drawn           | **yes**   | sketch |
| `note_priest` | a sketch of the altar, found early, meaning nothing yet | drawn           | no        | sketch |

`seal_false` must stay non-currency. The moment it is registered, the solver believes the offering is
satisfiable without the hidden corridor and will happily certify a world where the arc dead-ends.

## 4. Places

| id         | address                                         | what is there                                     | structural? | status |
| ---------- | ----------------------------------------------- | ------------------------------------------------- | ----------- | ------ |
| `p_altar`  | `expert_3 / floor 2 / where: last`              | the offering table — the lock                     | no          | sketch |
| `p_decoy`  | `master_2 / floor 1 / where: last`              | a chest holding `seal_false`, presented as a find | no          | sketch |
| `p_real`   | `master_2 / floor 3 / hiddenPath / where: last` | `seal_true`                                       | **yes**     | sketch |
| `p_doors`  | `wizard_1 / floor 0 / where: first`             | the god's doors, opened by `rite`                 | no          | sketch |
| `p_rumour` | `expert_1 / any`                                | `note_priest` in ordinary loot                    | no          | sketch |

`p_altar`, `p_decoy` and `p_doors` dress rooms that already exist — free. `p_real` needs a `hiddenPath`,
which carves, and that is the single structural row in the arc.

## 5. Beats

| id       | rail  | trigger                    | prop/place            | what is said or shown                                                           | assumes | status |
| -------- | ----- | -------------------------- | --------------------- | ------------------------------------------------------------------------------- | ------- | ------ |
| `b_hint` | found | `note_priest` picked up    | `note_priest`         | a drawing of a table with something on it. No words.                            | —       | sketch |
| `b_ask`  | link  | first arrival at `p_altar` | `p_altar`             | the priest names what he wants: a thing a pharaoh was buried holding            | —       | sketch |
| `b_no`   | link  | `seal_false` offered       | `p_decoy` → `p_altar` | refused — and the refusal says _why_, which is the only pointer the player gets | —       | sketch |
| `b_yes`  | link  | `seal_true` offered        | `rite`                | accepted; the priest is briefly, unprofessionally pleased                       | —       | sketch |
| `b_in`   | tier  | wizard unlocked            | `p_doors`             | the doors, and Fez declining to come in                                         | `b_yes` | sketch |

`b_hint` fires whenever the note is found and therefore says nothing that depends on anything. `b_no` is
the load-bearing one: the solver guarantees `seal_true` is reachable, never that the player knows to look.

## 6. The chain

| lock         | scope   | demands     | supplied by | placed at | status |
| ------------ | ------- | ----------- | ----------- | --------- | ------ |
| the offering | journey | `seal_true` | `p_real`    | `p_altar` | sketch |
| the doors    | global  | `rite`      | `b_yes`     | `p_doors` | sketch |

If `rite` is made to _be_ one of `master_a_1..4`, the wizard gate needs no change at all: the arc produces
a key that already opens it (Part 4 §4.5 B1). If instead the gate is taught to require the arc, that is B2
and everything in that row's consequences column applies.

## 7. Impact

| Axis          |                                                                                                                                                                                                                                                                                                                                                     |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Structure** | One structural row: `p_real` needs a `hiddenPath` in `master_2`. That floor re-carves, so saved exploration for it is invalidated and this ships with a migration, not after one. Everything else dresses rooms that exist.                                                                                                                         |
| **Systems**   | Two currencies (`seal_true`, `rite`) registered by a story mod — the supported extension point, since all gating currencies are already mod-owned. One new firing site: a lock that can _refuse_ and say why. **No change to `isTierUnlocked` if `rite` is a `master_a_*` treasure.** No new loot kind if the props ride `mapPiece`. No new screen. |
| **Content**   | 5 places, 4 props, 5 beats, ~12 lines × 2 locales, 4 drawn assets.                                                                                                                                                                                                                                                                                  |
| **Payoff**    | Lands on seams only — one `found`, three `link`, one `tier`. **It does not feed the drum**: no solve anywhere in this arc becomes more visible because of it. That is a real gap and not one this arc can close; it belongs to the reward cadence, not to the story.                                                                                |

## 8. Open

1. **Is `rite` one of the four wizard-unlock treasures, or a fifth requirement?** B1 or B2 in Part 4 §4.5.
   B1 costs nothing and means a player can reach wizard without ever meeting the priest.
2. **Does `b_no` point, or only refuse?** Pointing makes the hidden corridor findable and the twist land;
   it also spends the one moment where this arc could have been genuinely mysterious.
3. **Is the decoy worth a structural row?** Dropping `p_real`'s `hiddenPath` and putting `seal_true`
   behind an existing ward gate makes the arc free of re-carving, at the cost of the corridor being the
   thing the story is _about_.
4. **Does the arc know about the predecessor** (Part 4 §4.11 Q5), or is the priest the whole cast?
5. **Three chains like this, or one?** At ~12 lines and 4 assets each, three is a fortnight of authoring
   and gives a player three routes to wizard; one is a spine that every player walks.
