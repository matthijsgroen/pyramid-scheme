# The tomb is beautiful and nobody can get in

A critic's review of Pyramid Scheme as what it actually is on a phone — a casual mobile game —
followed by what I would change and in what order. Played on a 420×900 viewport: the travel screen,
two exterior boards, a pyramid interior, and four puzzle families off the develop-mode bench.

This is one reviewer's opinion, not an authored design decision. Where it cites a number, the number
came out of `yarn world-info` or `yarn validate-world` — regenerate them rather than trusting this
file, which will go stale the way UX notes do.

---

## I. The first ten minutes

The game opens by warning me about itself. A red banner: _completely new game, expect missing
content, rough edges, and save resets._ Then a lizard in a fez says hello, and behind him a treasure
map the size of my palm.

I pick a journey. A pyramid of numbered blocks floats in an enormous orange sky. Two blocks are
blank; the sky above them is empty for six hundred pixels. A third of the screen underneath is a
paragraph about the Great Sphinx that the lizard is standing in front of, so I can read about half
of it.

I fill in the blanks. The pyramid rearranges itself, does it again, and again, and eventually lets
me inside — where the screen goes brown. Almost all of it. At the very bottom, lit by a torch, is a
strip of corridor about one-sixth of a phone screen tall, with a small explorer standing in it and
two geometric shapes nearby that turn out to be rooms. I walk right. More brown. Three hearts and a
coin sit at the bottom.

Then I open a puzzle, and the game finally shows up: a 6×6 grid, a target beside every row and
column, a live running sum under each target so I can see exactly how wrong I am, and a hint button
that promises to name a move rather than hand me the answer. It's tight, legible, and genuinely
good. It took me several minutes and three screens of throat-clearing to reach it.

That gap — between how good the puzzle is and how much ceremony stands in front of it — is the whole
review.

---

## II. What's good, and I don't hand these out

**The map that runs backwards.** Most games unlock forward. This one is built so a key from the last
tier reopens a pyramid from the first, and a fragment hiding in that old pyramid is what an old tomb
was waiting on. No site is finished until every gate in it is open. That's a genuinely good structure
for a game meant to be played for months — and it isn't just a promise in a doc, there's a
reachability solver underneath making sure the world can't strand you.

**The no-words rule.** Every puzzle in the catalogue is solvable with the instructions ignored. No
typed input anywhere; numbers and glyphs are identical in every locale. That was adopted so the game
could ship in any language, and the side effect is that a child who can't read yet can play it. Most
educational software gets that backwards and ships a reading test with sums in it.

**The tableau.** A wall of arithmetic with hieroglyphs where the numbers should be, and you may only
place a glyph you've completed by hunting its fragments out in the pyramids. It's the one family that
reaches outside its own room, it's where the actual arithmetic lives, and it makes the collection
screen mean something. It is the best idea in the game. It is also among the least-used families in
the world — 40 authored placements out of 826.

**Craft where it shows.** Torchlight that falls off instead of lighting everything evenly. A chest
you've emptied drawn standing open with a tick on the lid. Rooms furnished with what that rank would
actually hold, so the gods' crystals stop turning up in the Valley of the Kings. Somebody cares here.

---

## III. What's wrong

**1. The front door is a toll booth.** The exterior sum-pyramid is the old game bolted in front of
the new one, and re-entering a site you've already cleared makes you solve a fresh one. A player with
four minutes on a bus pays that toll before touching the game they came for.

**2. The camera is pointed at the floorboards.** Three releases went into painting the interior and
the work is good, but the frame is ~85% empty brown with the action pinned to the bottom edge. You
built a stage and shot it through a mail slot.

**3. The traps are the weakest thing in the game and the only thing with teeth.** A timed four-option
multiple-choice sum. Everything else here is untimed deduction with no punishment; this is recall
speed on a clock that costs a heart. With four choices, panic-guessing is the mathematically correct
play. It contradicts the catalogue's own founding principle — recover hidden state by deduction — and
the good version you designed, the signposted opt-in trapped corridor, isn't in the shipped world at
all: zero trapped side-sections across all twenty journeys.

**4. The drum doesn't beat.** The world holds 1,780 puzzle nodes in the pyramids and 218 more in the
tombs. The mosaic — the meta-goal, the ending, "a to-do list disguised as art" — is 252 steps. Seven
boards out of eight move nothing the player can see. A casual game lives or dies on the reward
cadence, and this one asks for eight solves between visible beats.

**5. The fiction is paint.** "The Ordered Hours" is a Gantt chart in teal, orange and crimson sitting
on a stone wall. Nothing about being inside a pyramid changes how a board plays, and nothing you
learn about Egypt helps you solve one. (The recent funerary board — a day cutting a tomb, plastering,
carving, painting — is the counter-example. Do that everywhere.)

**6. Onboarding is a wall of prose.** The design calls for every family to ship a wordless,
self-teaching first instance. It isn't built; nine mechanics are queued behind it. What ships instead
is four bullets of paragraph text under the board, in a game whose founding rule is that text is
never load-bearing.

**7. Nothing survives an interruption.** The exterior board remembers what you typed. The puzzles
inside — the good ones, the long ones — hold their state in memory only. A phone call in the middle
of a 9×9 loses the 9×9. On mobile, that isn't a bug, it's an exit.

**8. It is completely silent.** There is not one audio file in the project. The solve moment — the
single most re-playable half-second in a puzzle game — makes no sound.

**9. "Expect save resets."** You are asking for a months-long collection habit while telling the
player, in red, at the top of every session, not to get attached.

---

## IV. What "long" means on a phone

Long is fine. But long for a casual mobile game means _months of four-minute visits_, not fifty hours
of sitting — and at the doc's own 90 seconds a board, this world is about fifty hours of sitting.
That's not a content problem, it's a shape problem. Four rules make the shape:

- **Time to first tap.** Cold open to solving something: five seconds. Not five screens.
- **The drum.** Every solve pays something the player can see. Every one.
- **Nothing is ever lost.** Close the app mid-board, come back a week later, the marks are where you
  left them.
- **A reason today.** Something that is true this morning and won't be tomorrow.

Fifty hours of content is a gift under those rules and a wall without them.

---

## V. Intrigue: the game has no plan for it

Intrigue is not story. It's the gap between what the player can see and what they can't, held open on
purpose. This game has three of those gaps already built and uses none of them.

**The mosaic is a progress bar cosplaying as art.** It reveals in order, slice after slice, so the
picture is a foregone conclusion by the third row. Make the reveal order the puzzle: scatter the
early pieces so a shape starts to suggest itself, hold the pieces that resolve what it _is_, and keep
the keystone for last. Same art, same 252 steps, entirely different feeling — this is a change to a
reveal order, not to an asset pipeline.

**The hieroglyph collection should become literacy.** Right now it's 295 fragments and a wall of "?"
tiles, and a completed glyph buys you a room. But the tableau already treats a glyph as a number that
holds still across a wall. Let it hold still across a _tomb_, or a tier: a player who works out what
𓃾 is worth on one wall and uses it on the next has learned something, and learning something is the
most durable reward a puzzle game has. You're one design decision away from the collection screen
being a dictionary instead of a trophy case.

**The locked door is your best hook and the map whispers it.** A ward gate the player cannot open yet
— because the key is in a tomb three tiers away — is intrigue in its purest form. Show those on the
map deliberately and early. Let a starter pyramid have one obvious sealed thing the player will be
thinking about for a week.

And give sites a rumour before they're entered. "Journey through the fertile Nile Delta" is a
brochure. "Something has got into this one" is a hook — and the game already draws the green in the
Delta on every floor, so the tell exists; it just arrives without the whisper that should precede it.

---

## VI. Entertainment: Fez is a tooltip with legs

You have a lizard in a fez. He is charming and he is currently a delivery mechanism for the sentence
"You can always stop this expedition by returning to the travel screen."

Give him opinions. Let him be wrong about things. Let him react to a bad trap answer, be impressed by
a fast solve, get greedy about loot, have one thing he refuses to talk about and a room he won't walk
into. He runs the shop already — a character who wants your money is a character with a personality
for free. The cost of this is text files, and the return is that players quote him.

And make the solve _feel_ like something. A sound, a haptic tick, the torch guttering as the door
opens. Half a second of feedback, two thousand times across the game. That's the cheapest
entertainment in the building and right now it's silent.

---

## VII. What I'd do, in order

| #   | Change                                                                                | Why it's here                                                   |
| --- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 1   | Persist in-progress boards the way the exterior board is persisted                    | An interrupted board is a lost player; it's the cheapest fix    |
| 2   | Drop the exterior board on re-entry (keep it once, as the ceremony of opening a site) | Removes the toll booth between the player and the game          |
| 3   | Frame the interior camera on the floor you're standing on                             | The art already exists and nobody can see it                    |
| 4   | Sound and haptics on solve, loot and door-open                                        | Highest entertainment-per-hour in the project                   |
| 5   | Make every solve move something visible — mosaic, glyph, or wallet                    | The drum; eight silent solves is the retention hole             |
| 6   | Replace the multiple-choice trap with a deduction under a clock, or cut it            | It's the only mechanic that punishes and the only one guessable |
| 7   | Build the wordless first encounter for every family                                   | Already designed; the prose panels are a stopgap that shipped   |
| 8   | Re-order the mosaic reveal so the picture is a mystery                                | Intrigue for the price of a sort function                       |
| 9   | Let a hieroglyph keep its value across a tomb or tier                                 | Turns collection into literacy — mastery the player can feel    |
| 10  | Give Fez an arc, opinions and a secret                                                | Text files; players quote characters, not mechanics             |
| 11  | Name a critical path of ~400 boards and let the other ~1,600 be optional depth        | Same content, legible shape, no fifty-hour wall                 |
| 12  | Ship save migration and take the red banner down                                      | You cannot ask for a months-long habit while promising resets   |

**If only three:** persist the boards, kill the re-entry toll, make the solve make a sound. Those
three change what it feels like to pick the game up, which is the only moment a casual game gets.

---

## VIII. What I would not touch

The family catalogue and its no-words rule. The technique solver that gates generation and sources
hints. The deterministic seeds. The reachability guarantee. The backward-running map. The
translation discipline.

That's the skeleton, and it's better than the game standing on it — which is exactly why the rest of
this stings.
