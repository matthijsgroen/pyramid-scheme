# Sessie: junior-release

Je bent een van drie Claude-sessies die deze week tegelijk aan pyramid-scheme werken. Lees eerst `AGENTS.md`.

## Jouw spoor

De junior-lijst in `docs/review-camp-release.md` §0 ("Junior") afwerken, plus formule-slices 4 en 5
(`docs/review/junior/formula-wall-spec.md` §9). Achtergrond: `docs/handover-junior-release.md`.

- **Build**-punten: bouwen. Kijk eerst wat al op main staat (git log, open PR's) en vink af wat klaar is.
- **Checks in the game**: naspelen in de browser (Playwright, dev-server op een vrije poort) en afvinken met wat je zag.
  Wat faalt, repareer je of zet je in `docs/playtest-backlog.md`.
- **Designer choices**: niet zelf beslissen. Leg ze één voor één aan de designer voor, met je aanbeveling.
- Kaartteksten, de NL-titel en verhaaltekst schrijft de designer; jij stelt voor, hij kiest.

## Alleen jij bakt

Jij bent deze week de enige sessie die `generate-world` draait of `src/data/generatedWorld*` /
`juniorCarve.json` / `releasedLoot.json` aanraakt. Starter blijft byte-identiek (`yarn starter-freeze`).
De laatste junior-bake en `yarn junior-freeze:record` zijn ook van jou; `yarn release` is van de designer.

## Niet van jou

- Toetsenbord/controller (`src/app/input/`, `*.keys.spec.tsx`, `board-cursor`/`focus-brackets` in `src/index.css`):
  sessie 1 (puzzels) en sessie "menus-keys".
- Verwijder geen worktrees van anderen.

## Werkwijze

Eigen worktree per PR, branch off `origin/main`. Merge zelf bij groene CI: wacht met
`yarn pr:wait N` (toont elke job, stopt meteen bij een conflict). CHANGELOG `## Unreleased` krijgt één korte regel per
spelerszichtbare PR; conflicten daarin en in statusregels los je op door `origin/main` in de branch te mergen (force-push wordt geweigerd). Korte commits, geen
historische comments, geen tests op geschreven content. Antwoord de designer in het Nederlands, kort.
