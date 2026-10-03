# Node actions

What happens when the explorer arrives somewhere that can do something.

Companion to `pyramid-interior-design.md` (what the node types are) and `../mods/floor-topology-design.md`
(the mod boundary this extension point answers to).

---

## The rule

**Arriving at a node never acts. Standing on it offers.**

A node that can do something for the player shows what it offers as a labelled button anchored to the
node. Tapping the button acts. Walking there, standing there and walking away again is always
available, and costs nothing.

The one exception is a node where arriving IS the intent, and there is exactly one: the shop. A shop
room is a claim point rather than a challenge — reaching it is the whole act — so it opens on arrival
as it always has.

## Why

Four places in the game answer a tap on a node by taking the screen away from the player, and in none
of them did the player necessarily ask for that:

| Node                               | On arrival today                         | Why that is wrong                                                                 |
| ---------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------- |
| Staircase                          | transits to the paired floor immediately | the player cannot stand on it; a stairhead on a route is a trapdoor               |
| The way out                        | a modal asks whether to leave            | the question is about the node, so it belongs on the node                         |
| A chest whose loot was left behind | opens the loot screen                    | the player may be crossing the room, not collecting                               |
| A puzzle that is a switch          | opens the encounter                      | re-solving is how the player changes their mind, not something to be dropped into |

The common shape: the node has something available, arrival is read as consent, and the player has no
way to decline except to not go there. That last part is the real cost — a node you cannot step on is
a hole in the floor.

## Puzzles as switches

A puzzle room whose purpose is to set state rather than to be defeated once. Solving it one way
rather than another chooses something, and solving it again changes the choice. The witness door is
the first: routing its beam to one shrine or the other opens that shrine's branch of a fork.

This is why such a room reopens at all, and the name says what `reEnterable` on `FamilyMeta` only
implies. A switch room's offer is "open it again"; an ordinary puzzle room, solved, offers nothing and
is simply ground.

## The contract

Core asks the registered providers what a cell offers:

```ts
type NodeAction = { id: string; label: string; act: () => void }
type NodeActionProvider = (cell: RoomCell, ctx: NodeActionCtx) => NodeAction[]
```

`ctx` carries `{ journeyId, levelNr, floorIndex, address, journeys }` — the existing `JourneyAPI`,
so a provider reads whatever state it owns without core learning what that state means.

Core registers the actions that belong to the map itself — a staircase's transit, the way out, and a
switch room's reopen, which reads `FamilyMeta` rather than any mod id. A mod registers its own: the
trap mod owns the consumable a player had no room to carry.

This is the same shape as the owned-key sources and held-key providers that already exist, and it
earns its place for one reason beyond tidiness: it is what stops core naming a mod's concepts.
`useSiteNavigation` currently reaches into `cell.stock` with the shop's purchased slots and into
`reward.type === "consumable"` with the trap mod's skipped list. Both leave.

## What the player sees

**A mark, from anywhere on the floor, on a node holding something left behind.** A chest whose loot
is still there, a switch that can be thrown again. This is what makes a return trip plannable rather
than remembered — the floor already reports that it holds something unfinished, but never where.

**No mark on a staircase or the way out.** Their art already says what they are, every time, and a
badge that is always present tells the player nothing.

**A labelled button when the explorer stands there**, anchored to the node and free to overflow its
square — which is how it stays a real tap target on the 37px cells of a wizard floor.

Several actions on one node get several buttons. Nothing authored today produces that, and the shape
costs nothing to allow.

## What this costs

**A deliberate floor change gains a tap.** Tap the staircase, walk, tap "go down". That is the price
of being able to stand on a stairhead at all, and staircases are common. It is the one part of this
worth watching in play.

**Leaving does not.** The way out already asks; the question moves from a modal onto the node.

## The write stays on arrival

The exit cell is written down when the explorer arrives, not when they confirm leaving, because
arriving only ASKS about leaving and the player may say no. A write during the teardown after a yes
is a fragile window, and it is what made the exploration marker wrong before. Moving the question
from a modal to a button does not move the write.

## Rejected

- **A confirm step on every encounter room** — solving a puzzle room is how the corridor past it
  opens, so arriving there is already the player's intent.
- **A mark on staircases and the exit** — always present, so it carries no information.
- **Keeping the three cases as their own branches with a button added to each** — the ordering bug
  between two of them was found in review, which is what parallel branches do.
