# Sessie: expert-prep

Je bent een van meerdere Claude-sessies die deze week tegelijk aan pyramid-scheme werken. Lees eerst `AGENTS.md`.

## Jouw spoor

Expert voorbereiden terwijl junior nog uitgebracht wordt. Bron: `docs/review-camp-release.md` §0 ("Expert") en
de art-roadmap (`docs/game-design/tile-art-brief.md`, `docs/instructions/site-map-art-handover.md`,
`docs/instructions/repaint-queue.md`, `art/rebuild.sh`).

1. **Art, samen met de designer.** De designer schildert de expert-art in deze sessie (Gemini). Jij zet prompts in
   `docs/instructions/repaint-queue.md`, bouwt scaffolds, importeert wat de designer aanlevert en legt elke import
   vast in `art/rebuild.sh`. Begin met `expert/wall-face`, `expert/threshold`, `door/ward-expert`, dan de expert-props.
   Een herschildering is altijd een prompt-aanpassing in het doc plus `yarn repaint <key>`, nooit een prompt in de chat.
   Expert krijgt de eerste props van meerdere cellen en grote kamers (zie de art-roadmap).
2. **Spelcode zonder bake:** hartjes vol op het thuiskomstscherm na schade van een val; een waterzak heelt één hart
   bij schade, twee met pack-mule (§0 Expert, §5 fase 1).
3. **Expert-locks** (4–6 acties, zie `docs/game-design/` en de lock-curriculum): schrijven en checken met
   `yarn lock`, niet plaatsen. `doubleBack` en `stoneGate` zijn van de designer: niet aanpassen.

## Grens: niet baken

De junior-carve is nog niet bevroren. Tot sessie "junior-release" `yarn junior-freeze:record` heeft gecommit:
geen `generate-world`, geen wijzigingen in `src/worldGen/`, `src/data/generatedWorld*`, `src/data/*Carve.json`,
`releasedLoot.json`. Wat een bake nodig heeft (Djoser-wandeling expert_4, plaatsing van locks en art in de wereld)
zet je op een lijst in `docs/review/expert/after-junior-freeze.md`. Kijk op main of de freeze er is
(`src/data/juniorCarve.json`) voordat je die lijst oppakt.

## Niet van jou

Toetsenbord/controller (`src/app/input/`, `*.keys.spec.tsx`), junior-release, master/wizard-content.

## Werkwijze

Eigen worktree per PR, branch off `origin/main`. Merge zelf bij groene CI: controleer elke job
(`gh pr checks N | awk -F'\t' '{print $1": "$2}'`). CHANGELOG: expert is nog niet uitgebracht, dus geen
`## Unreleased`-regels voor expert-only werk; wel voor wat spelers nu al zien (de hartjes, de waterzak).
Korte commits, geen historische comments, geen tests op geschreven content. Kijk in de browser. Antwoord de
designer in het Nederlands, kort.
