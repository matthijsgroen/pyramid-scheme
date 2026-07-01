# 🏺 Pyramid Scheme

An ancient Egyptian-themed puzzle adventure game where you explore mysterious pyramids, solve hieroglyphic puzzles, and collect treasures from forgotten tombs.

![Version](https://img.shields.io/badge/version-0.23.3-blue.svg)
![Status](https://img.shields.io/badge/status-alpha-orange.svg)
![Tech](https://img.shields.io/badge/tech-React%20+%20TypeScript%20+%20Vite-green.svg)

## 🎮 Game Overview

**Pyramid Scheme** is a mathematical puzzle game set in ancient Egypt. Players embark on expeditions through pyramids of increasing difficulty, solving symbolic puzzles that unlock the secrets of forgotten treasures.

### 🎯 Core Gameplay

- **Explore Pyramids**: Journey through 5 difficulty levels from Starter to Wizard
- **Solve Puzzles**: Decode hieroglyphic symbols using mathematical formulas
- **Collect Treasures**: Gather ancient artifacts and build your collection
- **Progressive Unlocking**: Complete expeditions to unlock treasure tombs
- **Map Pieces**: Find fragments that reveal the locations of hidden treasure vaults

## 🗺️ Journey Types

### 🔺 Pyramid Expeditions
Explore ancient pyramids across different times of day:
- **Morning** 🌅 - Fresh start expeditions
- **Afternoon** ☀️ - Peak exploration hours  
- **Evening** 🌇 - Twilight adventures
- **Night** 🌙 - Mysterious nocturnal quests

**Difficulty Progression:**
- 🟢 **Starter** - Learn the basics
- 🔵 **Junior** - Build confidence 
- 🟡 **Expert** - Test your skills 
- 🟠 **Master** - Challenge yourself
- 🔴 **Wizard** - Ultimate mastery

### 🗝️ Treasure Tombs
Hidden vaults unlocked by collecting map pieces:
- **Forgotten Merchant's Cache** - Ancient trading post treasures
- **Noble's Hidden Vault** - Aristocratic riches
- **High Priest's Treasury** - Sacred temple wealth
- **Pharaoh's Secret Hoard** - Royal burial treasures
- **Vault of the Gods** - Divine mythical artifacts

## 🧩 Puzzle Mechanics

### Tableau System
Each level presents a **tableau** - a themed story puzzle with:
- **Symbolic Formula**: Mathematical equations using hieroglyphic symbols
- **Progressive Revelation**: Text becomes clearer as you progress
- **Thematic Narratives**: Rich Egyptian mythology and culture

### Symbol Categories
- **👑 Professions** (p1-p15) - Merchants, priests, scribes, farmers
- **🐾 Animals** (a1-a15) - Sacred creatures like cats, crocodiles, ibis
- **💎 Artifacts** (art1-art15) - Tools, vessels, ceremonial objects  
- **🏺 Deities** (d1-d15) - Egyptian gods and goddesses

### Difficulty Scaling
- **Symbol Count**: Higher difficulties use more symbols per puzzle
- **Number Ranges**: Larger numbers in advanced levels
- **Floor Count**: More pyramid floors to explore

## 🏛️ Features

### 🌍 Internationalization
- **English** 🇺🇸 - Full game experience
- **Dutch** 🇳🇱 - Complete Nederlandse vertaling

### 🎨 Rich Theming
- **Egyptian Aesthetics**: Authentic hieroglyphic symbols and desert backdrops
- **Dynamic Time Cycles**: Day/night progression affects gameplay atmosphere
- **Responsive Design**: Seamless experience across desktop and mobile

### 📊 Progress Tracking
- **Journey Logs**: Track completed expeditions and found treasures
- **Collection System**: Catalog of discovered artifacts organized by category
- **Map Piece Progress**: Visual tracking of treasure tomb unlock requirements

### 🔧 Technical Features
- **Deterministic Randomization**: Consistent puzzle generation using seeded algorithms
- **Local Storage**: Progress persistence across sessions
- **Storybook Integration**: Component documentation and testing
- **Type Safety**: Full TypeScript implementation

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- Yarn package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/matthijsgroen/pyramid-scheme.git

# Navigate to project directory
cd pyramid-scheme

# Install dependencies
yarn install

# Start development server
yarn dev
```

The game will be available at `http://localhost:9164`

### Development Commands

```bash
# Development server
yarn dev

# Run tests
yarn test

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

**[`scripts/worldSpec.ts`](scripts/worldSpec.ts)**

Edit this file to shape the world: set difficulty constraints per tier or per journey, control how many puzzle floors a pyramid has, place tomb-key gates, and tune loot cadence. After editing, run the world builder to regenerate `src/data/` and inspect the results in Storybook (`yarn storybook` → *SiteMap/JourneyInspector*).

## 🏗️ Project Structure

```
scripts/
└── worldSpec.ts       # ← World authoring: rules, constraints, reward layout

src/
├── app/               # Main application components
├── data/              # Game data and configuration
├── game/              # Core game logic
├── ui/                # Reusable UI components
└── i18n/              # Internationalization setup

public/locales/        # Translation files
├── en/                # English translations
└── nl/                # Dutch translations
```

## 🎲 Game Mathematics

The puzzle system uses carefully balanced mathematical formulas:

- **Linear Progression**: Difficulty scales predictably across levels
- **Symbol Distribution**: Each difficulty tier introduces new symbol sets
- **Formula Complexity**: Operations range from simple addition to complex multi-step calculations
- **Deterministic Generation**: Same seed always produces same puzzles for consistency

## 🎮 Gameplay Tips

1. **Start Small**: Begin with Starter pyramids to learn the symbol system
2. **Pattern Recognition**: Look for recurring symbol combinations
3. **Progressive Learning**: Each difficulty builds on previous knowledge
4. **Map Collection**: Focus on completing expeditions to unlock treasure tombs
5. **Time Management**: Different times of day offer varied experiences

## ⚠️ Development Status

**This is an early alpha version!**
- Expect bugs and missing features
- Progress may be lost between updates
- Core gameplay mechanics are functional
- UI and balance are still being refined

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

- [ ] Sound effects and music
- [ ] Mobile app versions

---

*Embark on your journey through the mysteries of ancient Egypt! 🏺✨*
