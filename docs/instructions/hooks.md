# One Topic per Component

Applies to `src/app/**` and `src/mods/*/app/**`. `src/ui/**` keeps its own rule
(stateless — props in, JSX out; see `docs/instructions/architecture.md`).

## The rule

A component may own the state and effects of **one** topic. A second separable
topic — zoom, selection, reveal animation, storage sync, a timer — moves into its
own `use<Topic>.ts` file with its own spec.

The trigger is topic count, not line count. A 300-line component about one thing
is fine. A 60-line component juggling three is not.

Logic with **no** React state, effect or context is not a hook: it moves to a
plain exported function (`src/game/` if portable, a module beside the component
otherwise) and is tested without `renderHook`.

## Spotting a tangle

List the topics the component owns. One is fine; two or more separable ones means
extract. Smells:

- A `useEffect` whose dependencies share no vocabulary with the JSX
- State names from different domains in one component (`zoom*` + `selected*` + `reveal*`)
- Handlers that touch one cluster of state and never any other
- A comment that exists to explain which block of the component does what

## Hook contract

- One hook per file, filename = hook name, co-located with the consuming component
- Inputs arrive as **arguments** — a hook does not reach into context or globals
  itself, so a spec can drive it directly
- Returns a **named object**: values plus verb-named actions
- **No JSX** from a hook — something returning JSX is a component

```ts
export const useMapZoom = (bounds: Bounds) => {
  // ...
  return { scale, offset, zoomIn, zoomOut, reset };
};

// spec drives it directly
renderHook(() => useMapZoom(testBounds));
```

Promote a hook to `src/app/state/` only when a second feature consumes it or it
owns persisted game state. Otherwise it stays beside its component.

## Where the state itself lives

| Kind of state                                    | Home                                                  |
| ------------------------------------------------ | ----------------------------------------------------- |
| Nested shape, more than one kind of move          | Domain state model in `src/game/` (AGENTS.md §9)      |
| Persisted / cross-feature game state              | `src/app/state/` hook (AGENTS.md §3)                  |
| Ephemeral view state for one feature              | Co-located `use<Topic>.ts`                            |

A feature hook is React wiring: it holds the state and calls the domain's named
actions. It does not model the shape itself.

## Tests

Every extracted hook gets a sibling `use<Topic>.spec.ts` driven by `renderHook`.

One exemption: a hook that only wires already-tested hooks together, with no
branching of its own. If it grows a condition, it grows a spec.

## Untangling existing components

Extraction is behavior-neutral. An untangle ships as its own PR:

```
+ useRevealAnimation.ts
+ useRevealAnimation.spec.ts
~ SiteMapView.tsx        topic removed
= existing specs          zero changes
```

Existing specs must stay green **without edits**. Having to edit one is the signal
that behavior moved — say so in the PR description, or back the change out.
