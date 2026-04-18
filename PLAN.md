# Social Warriors Reloaded - Web Conversion Plan v1.2

## Project Overview

**Goal:** Convert the abandonedware game "Social Warriors" to a pure web (HTML/JS/CSS) application that runs in any modern browser without dependencies.

**License:** GPL 3.0

---

## Key Correction from v1.1

**CRITICAL:** The v1.1 plan stated "No Python source - must reverse-engineer from config JSON + SWF". This is FALSE.

Python source IS available and readable:
- `server.py` - Flask server with all HTTP endpoints
- `command.py` - 60+ game commands (buy, move, sell, level_up, etc.)
- `engine.py` - Core game logic and resource formulas
- `sessions.py` - Save data structures
- `constants.py` - Game constants
- `get_game_config.py` - Building/unit/item definitions

This changes everything. We can read the actual implementation instead of guessing.

---

## Architecture

### API Contract (From server.py)

The Flash client communicates via these endpoints:

```
Base URL: http://127.0.0.1:5055/dynamic/menvswomen/srvsexwars/

GET  /get_game_config.php?USERID=...&user_key=...&language=...
POST /get_player_info.php (same params)
POST /command.php (same params)

Request format for command.php:
  data = "<64-char-hash>;<json-payload>"

Example payload:
  {
    "first_number": 0,
    "publishActions": [...],
    "ts": 1234567890,
    "tries": 0,
    "accessToken": "...",
    "commands": [
      [map_id, "buy", [item_index, item_id, x, y, playerID, orientation, unknown, reason], resources_changed],
      [map_id, "move", [item_index, x, y, frame, string], resources_changed],
      ...
    ]
  }
```

Key commands from command.py:
| Command | Description |
|---------|-------------|
| buy | Place building/unit |
| move | Move item on map |
| sell / kill | Remove item |
| complete_tutorial | Mark tutorial complete |
| level_up | Level up village |
| expand | Unlock map expansion |
| store_item / place_stored_item | Storage mechanics |
| push_unit / pop_unit | Train units in buildings |
| collect | Collect from buildings |
| activate | Activate/use buildings |
| weekly_reward | Daily/weekly rewards |
| quest_mission | Advance missions |
| end_quest | Complete quest |
| fast_forward | Speed up timers |
| Research (area51, robotic) | Tech research (DEFERRED) |

### Target Architecture

```
/Social-Warriors-Reloaded/
├── index.html              # Entry point
├── game/
│   ├── index.js           # Main entry
│   ├── core/
│   │   ├── gameLoop.js   # 60fps game loop
│   │   ├── eventBus.js    # Pub/sub event system
│   │   └── commandHandler.js # Local command dispatcher (implements command.py logic locally)
│   ├── systems/
│   │   ├── resources.js  # Gold, Wood, Oil, Steel (read from engine.py)
│   │   ├── buildings.js  # Building system (read from constants.py)
│   │   ├── units.js      # Unit system
│   │   ├── quests.js     # Quest/mission system
│   │   └── research.js   # Area 51 / Robotic research (DEFERRED to Phase 5+)
│   ├── rendering/
│   │   ├── canvasRenderer.js  # Main canvas
│   │   └── sprites.js      # Sprite management
│   ├── data/
│   │   └── configLoader.js  # Load config/main.json
│   └── storage/
│       └── saveManager.js  # IndexedDB save system
├── assets/    # Copied game assets (images, sounds)
├── config/    # Game config JSON (from original)
└── public/    # Static public files
```

---

## Implementation Phases

### Phase 0: API Discovery (NEW - Critical First Step)

Before writing any JS, map the complete API contract from Python source:

- [ ] Fetch and parse server.py - document all endpoints
- [ ] Fetch and parse command.py - document all 60+ commands
- [ ] Fetch and parse engine.py - understand resource formulas
- [ ] Fetch sessions.py - understand save data structures
- [ ] Create `docs/API.md` - complete API specification document

### Phase 1: Foundation (Milestone: Empty Shell)
- [ ] Set up project structure
- [ ] Add Ruffle via CDN for future SWF rendering
- [ ] Create index.html shell
- [ ] Set up initial IndexedDB save system
- [ ] Add basic game loop
- [ ] Create commandHandler.js - local command dispatcher

### Phase 2: Core Systems (Milestone: World Loads)
- [ ] Canvas renderer with layers (background, game, UI)
- [ ] Input handling (mouse/keyboard)
- [ ] Load config/main.json
- [ ] Display village map (grid)
- [ ] Resource display (Gold, Wood, Oil, Steel)
- [ ] Building data loaded from JSON
- [ ] Auto-save working

### Phase 3: Building System (Milestone: Can Build)
- [ ] Building shop UI
- [ ] Place buildings on grid
- [ ] Resource costs deducted
- [ ] Building upgrade system
- [ ] Save on build/upgrade

### Phase 4: Unit System (Milestone: Can Recruit)
- [ ] Unit recruitment UI
- [ ] Unit training logic
- [ ] Unit display
- [ ] Unit data from JSON

### Phase 5: Quests (Milestone: Quests Work)
- [ ] Load quest data (villages/quest/*.json)
- [ ] Quest UI
- [ ] Quest progression

### Phase 6: UI Polish (Milestone: Playable)
- [ ] Main menu
- [ ] Village view (main game)
- [ ] Settings (sound toggle, save management)
- [ ] Error handling
- [ ] Loading screens

### Phase 7: Beta (Milestone: Beta)
- [ ] Playable start to finish
- [ ] No critical bugs
- [ ] Performance acceptable

### Phase 8: Release v1.0
- [ ] All Milestones complete
- [ ] Documentation
- [ ] Clean build

---

## Asset Strategy

### All Assets Kept
The original has many SWF files - some may be unused features. Keep them all.

| Directory | Count | Format | Notes |
|-----------|-------|--------|-------|
| sprites/ | ~200 | SWF | Units, buildings |
| characters_2/ | ~20 | SWF | Character avatars |
| magic/ | ~10 | SWF | Effect animations |
| images/ | ? | PNG/JPG | Static images |
| sounds/ | ? | MP3/WAV | Audio |
| fonts/ | ? | TTF/OTF | Fonts |
| flash/ | ? | SWF | UI elements |

---

## Milestones Summary

| Milestone | Deliverable |
|-----------|------------|
| M0 | API.md documentation complete |
| M1 | Empty shell + Ruffle + IndexedDB |
| M2 | World loads, resources display |
| M3 | Place/upgrade buildings |
| M4 | Recruit units |
| M5 | Quests work |
| M6 | UI complete |
| M7 | Beta - playable |
| M8 | Release v1.0 |

---

## Dependencies

- **Ruffle** - Flash emulator (CDN: https://unpkg.com/@ruffle-rs/ruffle)
- **No other dependencies** - vanilla JS

---

## Open Questions (Deferred)

1. **Combat system:** Will be added later (city-builder focus first)
2. **Multiplayer server:** Branch 'server' for later work
3. **Asset analysis:** Will analyze unused assets after playable

---

## License

GPL 3.0 - See LICENSE file

---

*Plan Version: 1.2*
*Revised: 2026-04-18*

## Changelog v1.1 → v1.2

| Change | Rationale |
|--------|----------|
| Added Phase 0: API Discovery | Map API contract from Python source BEFORE implementation |
| Renamed apiClient.js → commandHandler.js | No HTTP calls since client-side only; implement command.py logic locally |
| Removed Ruffle verification from Phase 1 | Defer SWF work to Phase 2 when canvas renderer exists |
| Marked research.js as DEFERRED | Area 51 / Robotic research not in initial scope |
| Sprites replace Ruffle bridge | Cleaner native sprite management architecture |