# Tableau System Redesign - Treasure Tomb Integration

## Overview
The tableau system has been completely redesigned to be thematically integrated with treasure tomb journeys. Each tableau tells a coherent story using symbols that progress logically through Egyptian civilization.

## Treasure Tomb Requirements Met

### 1. **Forgotten Merchant's Cache** (starter_treasure_tomb)
- **Levels**: 4 levels → 4 treasures → 2 runs
- **Tableaux Required**: 7 tableaux (levels 1-7)
- **New Symbols**: 8 symbols
  - **Professions**: Merchant (p10), Farmer (p8), Scribe (p3)
  - **Animals**: Fish (a6), Bee (a8)
  - **Artifacts**: Ankh (art1), Cartouche (art5)
  - **Deities**: Ra (d1)
- **Theme**: Basic trade, commerce, and divine blessing

### 2. **Noble's Hidden Vault** (junior_treasure_tomb)
- **Levels**: 6 levels → 6 treasures → 3 runs
- **Tableaux Required**: 10 tableaux (levels 8-17)
- **New Symbols**: 10 symbols (18 total available)
  - **Professions**: Pharaoh (p1), Vizier (p11), Artisan (p9)
  - **Animals**: Lion (a2), Ram (a13)
  - **Artifacts**: Eye of Horus (art2), Scepter (art7), Crook and Flail (art12)
  - **Deities**: Anubis (d2), Hathor (d15)
- **Theme**: Nobility, wealth, royal power, refined craftsmanship

### 3. **High Priest's Treasury** (expert_treasure_tomb)
- **Levels**: 8 levels → 8 treasures → 4 runs
- **Tableaux Required**: 13 tableaux (levels 18-30)
- **New Symbols**: 13 symbols (31 total available)
  - **Professions**: High Priest (p2), Embalmer (p7), Oracle (p12)
  - **Animals**: Monkey (a5), Goose (a7), Vulture (a11)
  - **Artifacts**: Sistrum (art3), Djed Pillar (art4), Canopic Jar (art6), Lotus Flower (art14)
  - **Deities**: Horus (d3), Thoth (d4), Isis (d9)
- **Theme**: Religious ceremonies, sacred rituals, divine wisdom

### 4. **Pharaoh's Secret Hoard** (master_treasure_tomb)
- **Levels**: 10 levels → 10 treasures → 5 runs
- **Tableaux Required**: 16 tableaux (levels 31-46)
- **New Symbols**: 15 symbols (46 total available)
  - **Professions**: Architect (p4), General (p5), Mason (p14), Guardian (p15)
  - **Animals**: Hippopotamus (a1), Elephant (a3), Giraffe (a14), Jackal (a15)
  - **Artifacts**: Pyramid (art9), Solar Barque (art10), Obelisk (art11), Uraeus Crown (art15)
  - **Deities**: Bastet (d5), Sobek (d6), Osiris (d10)
- **Theme**: Royal construction, divine architecture, monumental building

### 5. **Vault of the Gods** (wizard_treasure_tomb)
- **Levels**: 12 levels → 12 treasures → 6 runs
- **Tableaux Required**: 19 tableaux (levels 47-65)
- **New Symbols**: 12 symbols (58 total - all inventory)
  - **Professions**: Physician (p6), Sailor (p13)
  - **Animals**: Gazelle (a4), Turtle (a9), Frog (a10), Owl (a12)
  - **Deities**: Khepri (d7), Wadjet (d8), Seth (d11), Nephthys (d12), Ptah (d13), Sekhmet (d14)
- **Theme**: Ultimate divine mastery, cosmic harmony, all elements united

## Symbol Distribution Strategy

### Progressive Access
- Each tomb introduces new symbols while retaining access to all previous symbols
- Creates narrative continuity and increasing complexity
- Allows for richer storytelling combinations in later tombs

### Thematic Coherence
- **Starter**: Basic survival and trade (merchant, farmer, scribe)
- **Junior**: Social hierarchy and nobility (pharaoh, vizier, artisan)
- **Expert**: Religious and spiritual (priests, sacred animals, divine artifacts)
- **Master**: Construction and power (architects, builders, massive creatures, monuments)
- **Wizard**: Ultimate knowledge and mastery (healers, wise creatures, all gods)

### Complete Inventory Usage
All 58 inventory items are distributed:
- **15 Deities**: All used across all tombs
- **15 Professions**: All used across all tombs  
- **15 Animals**: All used across all tombs
- **13 Artifacts**: All used across all tombs

## Narrative Features

### Story Progression
Each tableau description tells a short story using the specific symbols assigned to that level, creating:
- Thematic consistency within each tomb
- Natural narrative progression across difficulty levels
- Rich Egyptian cultural context
- Logical symbol relationships

### Examples of Storytelling
- **Level 1**: "A merchant and farmer trade fish and bees for the sacred ankh, blessed by Ra's morning light."
- **Level 46**: "The Pharaoh commands architect, general, mason, and guardian alongside all royal beasts..."
- **Level 65**: "In the ultimate divine ceremony, physician, sailor, Pharaoh, and High Priest unite all sacred creatures..."

## Technical Implementation

### Database Structure
Each tableau now includes:
- `tombJourneyId`: Links to specific treasure tomb journey
- `inventoryIds`: Only symbols available to that tomb level
- `name`: Thematic title matching the tomb and story
- `description`: Rich narrative using the specific symbols

### Validation
- ✅ All 58 inventory symbols used exactly once in new symbol assignments
- ✅ Progressive access maintained (each tomb can use previous tomb symbols)
- ✅ Correct number of tableaux for each tomb's requirements
- ✅ Symbol counts appropriate for complexity progression
- ✅ Thematic consistency within each tomb category

This redesign creates a cohesive, story-driven tableau system that enhances the treasure tomb experience while maintaining mathematical complexity and Egyptian cultural authenticity.
