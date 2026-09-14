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

### Which now, and whose then

The player is a present-day explorer — hat, boots, compass, a folded map with a cross on it — walking into
tombs sealed three thousand years ago. **So the priest cannot refuse anybody: he has been dead since long
before anyone reading this was born.** Three answers, and the arc wants all three.

**The person is gone; the mechanism is not.** The offering table still works because it was built to work
with nobody attending it. The ask is a carving, the refusal is a lock that does not turn, and neither needs
a voice — which also keeps the whole exchange _drawn_ rather than written (FORMAT §3). Nobody in this arc
is a ghost, and nothing has to be resurrected to make it run.

**The rite was interrupted, which is why it is still open.** The seal never reached the priest. Whatever
happened three thousand years ago, the errand was left half-done, and the altar has been waiting for the
rest of it ever since. That is the answer to "why is this still here for me to finish" that does not
require anyone to have been keeping it warm.

**And the forgery is modern.** A convincing copy of a pharaoh's seal is exactly what the antiquities trade
makes, and somebody got here before the player. So the decoy is not an ancient imitation buried with a
noble — it is recent, planted or abandoned by whoever tried this first. **That twist is only available
because the game is set in the now**, and it knots the fake, the predecessor and Fez's own trade into one
thing instead of three.

The useful consequence: the paper the player finds comes in **two ages**. Ledgers three thousand years old,
and notes from a hundred. Telling them apart is the same skill as telling a real seal from a copy.

### Why the ladder runs merchant → noble → priest → pharaoh → gods

**The arc does not invent this order. The world already has it**, in the tomb names, in tier order:

| Tier    | Tomb                                                            |
| ------- | --------------------------------------------------------------- |
| starter | Forgotten Merchant's Cache                                      |
| junior  | Noble's Hidden Vault                                            |
| expert  | High Priest's Treasury · Inner Sanctum                          |
| master  | Pharaoh's Secret Hoard · Hall of Osiris                         |
| wizard  | Vault of the Gods · Realm of Cosmic Forces · Throne of Eternity |

A social ascent, already authored and currently unsaid. Everything below is the arc noticing it.

**The obvious tombs were robbed first, so what is left is paper.** The gold left a merchant's cache
centuries ago. What nobody bothered carrying out is ledgers, tallies, a sketch of a door — which is why
the early tiers hand the player knowledge rather than treasure, and makes that read as a discovery rather
than as a design compromise.

**Merchants kept records.** A cache says who supplied what to whom, including who fitted out a royal
burial. The trail to a pharaoh's goods runs through the people who sold them — which gives Fez a domain he
is genuinely good at, rather than a stall and a greeting.

**You learn what real looks like by handling imitations.** Nobles were buried with cheaper copies of royal
regalia. So the early tiers are where the player handles fakes without knowing that is what they are doing,
and by master the decoy seal is convincing _because_ of it. The twist is then earned rather than sprung:
it is the fiction of the difficulty curve.

**Fez's reason is not the player's, and that is the joke.** He is not approaching the gods. Merchants and
nobles are easier to rob and he is working up the market. He finds out late what he has been helping with,
which is the arc his own beats already point at (Part 3 §3.4).

**Introductions are what the tiers actually are.** You cannot walk up to a high priest. A merchant knew a
noble, a noble knew a priest — so each tier's unlock treasure is the token that vouches for you at the next
door. That reading costs nothing: it is Part 4 §4.5 B1, retro-fitting meaning onto `master_a_1..4` without
touching `isTierUnlocked`, and it gives every tier a reason to exist that is not "bigger numbers".

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

`p_altar` sits in the High Priest's Treasury because that is where the priest is — the tomb ladder is the
arc's spine, not a backdrop to it. It, `p_decoy` and `p_doors` dress rooms that already exist, so all three
are free. `p_real` needs a `hiddenPath`, which carves, and that is the single structural row in the arc.

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

## 7. Waypoints

| id        | points at | mechanic         | precision                   | gated by              | status |
| --------- | --------- | ---------------- | --------------------------- | --------------------- | ------ |
| `w_seal`  | `p_real`  | compass (inward) | **L1 — which pyramid only** | `k_seal_is_false`     | sketch |
| `w_altar` | `p_altar` | compass (inward) | L1                          | `k_what_priest_wants` | sketch |

Both are deliberately L1. L3 would name the cell, which deletes the hidden corridor the arc is about — the
player should be sent to `master_2` and left to find the rest.

**Both hang off an ask, never off the refusal** (FORMAT §7). Learning what a proper offering is points you
at the pyramid that holds one; the early sketch of the altar points you at the altar. A player who never
offers the fake still gets steered, and a player who does is not being rewarded for the mistake.

Which leaves `k_seal_is_false` carrying no navigation at all — its job is legibility. It is how the player
knows the thing in their hands is a copy, and how the offering lock can tell the difference. The corridor
is still theirs to find.

Each unlock is one of the arc's own props rather than a detector perk, so the arc cannot become invisible
to a player who happened not to earn someone else's treasure.

**Needs the core change first.** `CompassResult` carries `hieroglyphId` and `pieceIndex`, so no scanner can
honestly point at `p_real` until those are generalised (FORMAT §7).

## 8. Impact

| Axis          |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Structure** | One structural row: `p_real` needs a `hiddenPath` in `master_2`. That floor re-carves, so saved exploration for it is invalidated and this ships with a migration, not after one. Everything else dresses rooms that exist.                                                                                                                                                                                                                                                                                                                                                  |
| **Systems**   | Two currencies (`seal_true`, `rite`), registered wherever currency machinery lives — the supported extension point, since all gating currencies are already mod-owned. One new firing site: a lock that can _refuse_ and say why. **No change to `isTierUnlocked` if `rite` is a `master_a_*` treasure.** No new loot kind if the props ride `mapPiece`. No new screen. **Leans on:** tomb-treasure (the tier-unlock treasures it hangs `rite` on) and whichever mod ends up owning waypoints. Not the shop — Fez comments, but nothing in the chain passes through a stall. |
| **Content**   | 5 places, 4 props, 5 beats, ~12 lines × 2 locales, 4 drawn assets.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Steering**  | Two compass waypoints at L1, both unlocked by the arc's own knowledge props — no dependency on unrelated perks. **Blocked on one core change**: `CompassResult` must stop naming hieroglyph fields before a story scanner can register honestly.                                                                                                                                                                                                                                                                                                                             |
| **Payoff**    | Lands on seams only — one `found`, three `link`, one `tier`. **It does not feed the drum**: no solve anywhere in this arc becomes more visible because of it. That is a real gap and not one this arc can close; it belongs to the reward cadence, not to the story.                                                                                                                                                                                                                                                                                                         |

## 9. Open

1. **Is `rite` one of the four wizard-unlock treasures, or a fifth requirement?** B1 or B2 in Part 4 §4.5.
   B1 costs nothing and means a player can reach wizard without ever meeting the priest.
2. ~~**Does `b_no` point, or only refuse?**~~ **Decided: it only refuses.** Waypoints hang off the ask
   (FORMAT §7), so the player is already pointed at `master_2` before they ever offer the fake. The
   refusal's job is to say that what they hold is a copy — the corridor stays theirs to find.
3. **Is the decoy worth a structural row?** Dropping `p_real`'s `hiddenPath` and putting `seal_true`
   behind an existing ward gate makes the arc free of re-carving, at the cost of the corridor being the
   thing the story is _about_.
4. **How much of `the_other` is ever shown?** The forgery says someone tried this before and got it wrong,
   which is the whole character and costs nothing. Saying more — a name, a fate, whether they are still
   down here — is where this turns into needing a scene.
5. **Three chains like this, or one?** At ~12 lines and 4 assets each, three is a fortnight of authoring
   and gives a player three routes to wizard; one is a spine that every player walks.
