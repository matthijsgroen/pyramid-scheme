# 🏺 Pyramid Scheme

A puzzle adventure in ancient Egypt: explore pyramids, solve logic puzzles, and collect treasures from forgotten tombs.

![Status](https://img.shields.io/badge/status-early%20access-orange.svg)
![Tech](https://img.shields.io/badge/tech-React%20+%20TypeScript%20+%20Vite-green.svg)

See [CHANGELOG.md](CHANGELOG.md) for the version history.

## 🎮 Game Overview

**Pyramid Scheme** is a logic puzzle adventure set in ancient Egypt. You lead expeditions into pyramids, walk their floors room by room, solve the puzzles that bar the way, and bring what you find back to your camp. Fragments, map pieces and keys open treasure tombs, and the treasures in those tombs reopen floors you left behind.

### 🎯 Core Gameplay

- **Explore pyramid floors**: walk branching floors with side paths, hidden corridors and locks you open with levers, plates, stones, torches and water
- **Solve puzzles**: logic puzzle families such as sudoku, hidato, rush hour, balance scales, light beams, futoshiki, star battle and procession
- **Collect hieroglyphs**: complete hieroglyphs to read the formula walls in the tombs
- **Survive traps**: trap corridors cost hearts; waterskins heal you on the way, and the camp refills them
- **Trade with Fez**: sell what you find, buy animals and gear at his stall
- **Build the camp**: camp finds and parts turn your camp into a home over the expeditions
- **Claim treasures**: tomb treasures give lasting effects (more health, armour, detectors) and open sealed ward gates back in the pyramids
- **Follow the story**: a five-act story told by the people you meet along the way

## 🗺️ Expeditions

Five difficulty tiers, four expeditions each, plus their treasure tombs:

| Tier       | Expeditions                                                                                 | Tombs                                                           |
| ---------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 🟢 Starter | Dawn at the Sphinx · Papyrus Merchant's Route · Temple of Bastet · Scribe's Academy         | Forgotten Merchant's Cache                                      |
| 🔵 Junior  | Sacred Ibis Migration · Valley of the Artisans · Temple of Thoth · Lighthouse of Alexandria | Noble's Hidden Vault                                            |
| 🟡 Expert  | Valley of the Kings · Karnak Temple Complex · Nile Delta Expedition · Pyramid of Djoser     | High Priest's Treasury → Inner Sanctum                          |
| 🟠 Master  | Great Pyramid of Giza · Book of the Dead · Curse of the Pharaohs · Tomb of Nefertari        | Pharaoh's Secret Hoard → Hall of Osiris                         |
| 🔴 Wizard  | Ra's Solar Journey · Colossi of Memnon · Chamber of Ma'at · Eternal Pyramid                 | Vault of the Gods → Realm of Cosmic Forces → Throne of Eternity |

The game is released one tier at a time. Starter is out; junior is next.

## 🏛️ Features

- **Languages**: English and Dutch, with translations into most European languages and Indonesian
- **Offline play**: installable as a PWA, works without a connection
- **Saves that last**: your progress carries over between releases
- **Travel card**: move your save to another device with a QR card from Settings
- **Keyboard**: walk the map with arrow keys or WASD
- **Phone and desktop**: one layout that fits both

## 🚀 Getting Started

### Prerequisites

- Node.js 24
- Yarn package manager

### Installation

```bash
git clone https://github.com/matthijsgroen/pyramid-scheme.git
cd pyramid-scheme
yarn install
yarn dev
```

The game will be available at `http://localhost:9164`

### Development Commands

```bash
# Development server
yarn dev

# Run tests
yarn test

# Full gate (lint, types, tests, freeze guards, betterer)
yarn verify

# Puzzle and world content checks (slow)
yarn verify-content

# Type checking
yarn check-types

# Linting
yarn lint

# Build for production
yarn build

# Storybook component documentation
yarn storybook
```

## 🌍 World Shaping

The entire level structure — puzzle counts, floor depths, reward distribution, and gate types — is controlled by a single authoring file:

**[`src/worldGen/worldSpec.ts`](src/worldGen/worldSpec.ts)**

Edit this file to shape the world: set difficulty constraints per tier or per journey, control how many puzzle floors a pyramid has, place tomb-key gates, and tune loot cadence. After editing, run **`yarn generate-world`** to regenerate `src/data/generatedWorld.ts` (or **`yarn validate-world`** to check the spec without writing), then inspect the results in Storybook (`yarn storybook` → _SiteMap/JourneyInspector_).

## 🏗️ Project Structure

```
src/
├── worldGen/          # World authoring: worldSpec.ts rules, constraints, reward layout
├── app/               # Main application components
├── data/              # Game data and configuration
├── game/              # Core game logic
├── ui/                # Reusable UI components (atoms/, molecules/, organisms/)
├── mods/              # Toggleable game mods (camp, hieroglyph, mosaic, puzzle, shop, story, trap, …)
├── contexts/          # React context providers
├── config/            # App-level configuration
├── support/           # Shared utilities and helpers
└── i18n/              # Internationalization setup

public/locales/        # Translation files, one folder per language
```

## 📚 Design docs

Game design lives in [`docs/game-design/`](docs/game-design/): start with [`game-loop.md`](docs/game-design/game-loop.md), [`journeys.md`](docs/game-design/journeys.md) and [`PUZZLE_FAMILIES.md`](docs/game-design/PUZZLE_FAMILIES.md). [`AGENTS.md`](AGENTS.md) describes the architecture and workflows.

## 🤝 Contributing

This is a personal project, but feedback and suggestions are welcome! Please feel free to:

- Report bugs via GitHub issues
- Suggest gameplay improvements
- Contribute translations for additional languages

## 📄 License

This project is private and for personal use.

## Interesting sources

- https://www.youtube.com/watch?v=90An1dnvwyc

## 🎯 Roadmap

- [ ] Junior, expert, master and wizard releases
- [ ] Controller support
- [ ] Sound effects and music

---

_Embark on your journey through the mysteries of ancient Egypt! 🏺✨_
