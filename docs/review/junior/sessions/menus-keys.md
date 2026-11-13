# Sessie: menus-keys

Je bent een van drie Claude-sessies die deze week tegelijk aan pyramid-scheme werken. Lees eerst `AGENTS.md`.

## Jouw spoor

Slice 3 van `docs/review/junior/keyboard-controller-plan.md`: focuslook + ruimtelijke navigatie in de menu's
(kamp, reiskaarten, collectie, instellingen, winkel, mozaïek), klikbare divs worden knoppen, plus een
betterer-guard. Lees het plan helemaal (§2 en de menutabel in §4).

Wat er al is (main):

- Inputkern in `src/app/input/`: acties, toetsenbord- en padbron, lagenstapel (`openLayer`, `dispatchInput`),
  `spatialNavigation.ts` (`nearestInDirection`), `domLayer.ts`, `pageLayers.ts`, `modality.ts` (`data-input` op
  `<html>`), `useInputLayer`, `useFocusBoard` (knoppenborden).
- Look B voor knoppen is besloten en bestaat als utility `focus-brackets` in `src/index.css` (zachte ember-gloed +
  hoekhaken, alleen bij `data-input` keys/pad). Gebruik die; touch ziet niets nieuws.
- Gaten die bij jou horen: `back` doet nog niets in RewardFlow, LevelCompletionHandler en de terugknop van de
  PyramidExpedition-header; Start (`menu`) opent Instellingen nog niet; de terugknoppen van hendel, fakkel en
  leesmuur tonen alleen de browserring.

Per scherm: werkt met pijltjes + Enter + Escape en met een pad (nagebootst in een test), story of screenshot in
`docs/review/junior/board-cursor/` zodat de designer het in Storybook kan beoordelen. De designer test en dan
itereren jullie.

## Niet van jou

- Puzzelborden (`src/mods/*/app/**` boards, `useGridCursor`, `*.keys.spec.tsx`): sessie 1.
- Baken / `src/data/generatedWorld*`: sessie "junior-release".
- Slice 8 (glyphs + blok "Bediening"): sessie 1, na jou.

## Werkwijze

Eigen worktree per PR, branch off `origin/main`. Merge zelf bij groene CI: controleer elke job
(`gh pr checks N | awk -F'\t' '{print $1": "$2}'`). CHANGELOG `## Unreleased` één korte regel per spelerszichtbare
PR; conflicten in CHANGELOG en de statusregel van het plan los je op met een rebase. Kijk in de browser, niet alleen
naar code. Korte commits, geen historische comments. Antwoord de designer in het Nederlands, kort.
