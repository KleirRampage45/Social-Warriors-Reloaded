# Social Warriors - API Specification

**Source:** Python source files from original game (server.py, command.py, engine.py, sessions.py)
**Purpose:** Complete reference for implementing the web client

---

## 1. HTTP Endpoints

Base URL: `http://127.0.0.1:5055/dynamic/menvswomen/srvsexwars/`

### 1.1 Game Config

```
GET /get_game_config.php
Params:
  - USERID: string
  - user_key: string
  - language: string
Response: Full game config JSON (buildings, units, items)
```

### 1.2 Player Info

```
POST /get_player_info.php
Params:
  - USERID: string
  - user_key: string
  - language: string
  - user?: string (optional, for visiting neighbors)
  - client_id?: int (optional)
  - map?: int (optional)

Response: Player village data
  - Current player: full save data
  - Visiting neighbor: returns neighbor's village
  - Quest maps: returns quest map data
```

### 1.3 Command Execution

```
POST /command.php
Params:
  - USERID: string
  - user_key: string
  - language: string
  - data: string = "<64-char-hash>;<json-payload>"

Request payload format:
{
  "first_number": int,
  "publishActions": [...],
  "ts": int (timestamp),
  "tries": int,
  "accessToken": string,
  "commands": [
    [map_id, cmd_name, args_array, resources_changed_array],
    ...
  ]
}

Response: { "result": "success" }
```

---

## 2. Commands Reference

### 2.1 Building/Unit Commands

| Command | Args | Description |
|---------|------|------------|
| buy | [item_index, item_id, x, y, playerID, orientation, unknown, reason] | Place building/unit on map |
| sell | [item_index, reason] | Remove item from map |
| kill | [item_index, reason] | Kill item |
| kill_iid | [item_id, reason_str] | Kill by item ID |
| batch_remove | [index_list_json] | Remove multiple items |
| move | [item_index, x, y, frame, string] | Move item on map |
| collect | [item_index] | Collect from building |
| orient | [item_index, orientation] | Rotate item |
| expand | [expansion_id] | Unlock map expansion |

### 2.2 Storage Commands

| Command | Args | Description |
|---------|------|------------|
| store_item | [item_index] | Store item in inventory |
| place_stored_item | [item_index, item_id, x, y, playerID, orientation, autoactivable, imgIndex] | Place stored item |
| sell_stored_item | [item_id] | Sell stored item |
| store_add_items | [item_id_list] | Add multiple to storage |

### 2.3 Training Commands

| Command | Args | Description |
|---------|------|------------|
| push_unit | [index_unit, index_building] | Train unit in building |
| pop_unit | [index_building, index_unit, item_id, x, y, playerID, unknown] | Remove unit from building |
| push_queue_unit | [index] | Add to training queue |
| pop_queue_unit | [index] | Remove from training queue |
| push_queue_unit2 | [atom_fusion_index, unit_id] | Add unit to Atom Fusion |

### 2.4 Progression Commands

| Command | Args | Description |
|---------|------|------------|
| complete_tutorial | [tutorial_step] | Mark tutorial complete |
| set_goals | [goal_id, progress_json] | Update goal progress |
| complete_goal | [goal_id] | Mark goal complete |
| level_up | [new_level] | Level up village |
| collect_mission | [next_mission] | Advance mission chapter |
| end_quest | [response_json] | Complete quest |
| set_quest_var | [key, value] | Set quest variable |

### 2.5 Resource Commands

| Command | Args | Description |
|---------|------|------------|
| flash_debug | [cash, unknown, xp, gold, oil, steel, wood] | Sync resources |
| trade_resource | [resource_type, sold_or_bought] | Resource trading |
| add_xp_unit | [item_index, xp_gain, level_opt] | Add XP to unit |
| win_daily_bonus | [item, next_bonus_id] | Claim daily bonus |
| weekly_reward | [item_index, item_id, x, y, playerID] | Claim weekly reward |

### 2.6 Research Commands (DEFERRED)

| Command | Args | Description |
|---------|------|------------|
| next_research_step | [type] | Advance research step |
| research_buy_step_cash | [cash, type] | Buy research step |
| next_research_item | [type] | Complete research |
| reset_research_item | [type] | Reset research |

Types: 0 = Area 51, 1 = Robotic Center

### 2.7 Special Commands

| Command | Args | Description |
|---------|------|------------|
| activate | [item_id, activate_flag] | Activate building |
| use_magic | [magic_id] | Use magic spell |
| buy_magic | [magic_id] | Buy magic spell |
| buy_mana_new | [] | Buy mana (no-op) |
| darts_reset | [seed] | Reset targets game |
| darts_new_free | [] | Get free targets shot |
| darts_shoot_balloon | [index, won_extra] | Shoot target |
| buy_premium_account | [package_index] | Purchase premium |
| resurrect_hero | [index, item_id, x, y, used_syringe] | Resurrect hero |
| fast_forward | [seconds] | Speed up timers |
| set_resource_allies | [resource, index] | Set allies market |
| buy_offer_pack | [package_id, item_list] | Buy offer pack |
| soulmixer_speedup | [atom_fusion_index] | Speed up training |
| rt_open_graph_unit | [item] | Publish unit to social |
| first_time_marketplace | [] | Mark auction house seen |
| ping | [] | Ping server |
| set_variables | [] | Set player resources |

### 2.8 Combat Commands (DEFERRED)

| Command | Args | Description |
|---------|------|------------|
| end_attack | [response_json, unknown] | End PvP attack |

---

## 3. Data Structures

### 3.1 Village Save Format

```json
{
  "playerInfo": {
    "pid": "USERID",
    "name": "Empire Name",
    "pic": "avatar_url",
    "default_map": 0,
    "cash": 1000,
    "completed_tutorial": 0
  },
  "maps": [
    {
      "id": 0,
      "xp": 0,
      "level": 1,
      "gold": 100,
      "wood": 100,
      "oil": 100,
      "steel": 100,
      "timestamp": 1234567890,
      "items": {
        "0": [item_id, x, y, timestamp, orientation, queue, attr, player],
        "1": [...]
      },
      "store": { "item_id": quantity },
      "expansions": [],
      "level": 1,
      "idCurrentMission": "1",
      "timestampLastChapter": 1234567890,
      "currentQuestVars": {},
      "questTimes": {},
      "numTradesDone": 0,
      "timestampLastTrade": 1234567890,
      "timestampLastTreasure": 1234567890,
      "resourceAlliesMarket": "gold"
    }
  ],
  "privateState": {
    "boughtUnits": [],
    "unitCollectionsCompleted": [],
    "collections": [],
    "researchStepNumber": [0, 0],
    "researchItemNumber": [0, 0],
    "timeStampDoResearch": [0, 0],
    "goals": [],
    "inventoryItems": {},
    "deadHeroes": {},
    "timeStampEndPremium": 0,
    "magics": {},
    "bonusNextId": 1,
    "timestampLastBonus": 0,
    "weeklyRewardIndex": 0,
    "timeStampMondayBonus": 0,
    "dartsRandomSeed": 0,
    "dartsBalloonsShot": [],
    "dartsHasFree": true,
    "dartsGotExtra": false,
    "timeStampDartsReset": 0,
    "timeStampDartsNewFree": 0,
    "marketPlaceFirstTime": false,
    "questsRank": {}
  },
  "version": "..."
}
```

### 3.2 Item Structure

```
[index]: [item_id, x, y, timestamp, orientation, queue, attr, player]

item_id: int     - Item type ID from config
x: int          - X position on grid
y: int          - Y position on grid
timestamp: int  - Creation timestamp
orientation: int - Rotation (0-3)
queue: list     - Units in training queue
attr: dict     - Attributes {si: [], nc: 0, xp: 0, cp: 0, ts: 0, nu: 0, ui: 0}
player: int     - Player team (1 = player, 0 = enemy)
```

### 3.3 Resource Format

```
[unknown, xp, gold, wood, oil, steel, cash, mana]

- Negative = spent by player
- Positive = gained by player
```

---

## 4. Resource Formulas

### 4.1 Apply Resources (from engine.py)

```python
map["xp"] = max(map["xp"] + xp, 0)
map["gold"] = max(map["gold"] + gold, 0)
map["wood"] = max(map["wood"] + wood, 0)
map["oil"] = max(map["oil"] + oil, 0)
map["steel"] = max(map["steel"] + steel, 0)
playerInfo["cash"] = max(playerInfo["cash"] + cash, 0)
privateState["mana"] = max(privateState["mana"] + mana, 0)
```

### 4.2 Daily/Weekly Resets (from engine.py)

- Trades reset at midnight (every 86400 seconds)
- Darts reset on Monday (every 604800 seconds, offset to Thursday)

---

## 5. Item Attributes

| Key | Description |
|-----|-------------|
| si | Social Assist: array of friend help flags |
| nc | Click to Build: number of clicks remaining |
| xp | Unit XP |
| cp | Collection progress |
| ts | Training start timestamp |
| nu | Number in queue |
| ui | Unit ID in queue |

---

## 6. Building Categories

From constants.py:
- CAT_BUILDING_TOWN = 1 (Houses, Town Hall)
- CAT_BUILDING_WAR = 2 (Towers, Walls)
- CAT_BUILDING_TROOPS = 3 (Barracks, Stables)
- CAT_DECO = 4 (Decorations)
- CAT_WONDER = 5 (Wonders)
- CAT_TERRAIN = 6 (Terrain)
- CAT_UNIT = 7 (Mobile units)
- CAT_ENERGY = 8 (Energy generators)

---

## 7. Quest IDs (from constants.py)

```
100000001: QUEST 01: BAZOOKA
100000002: QUEST 02: CENTRAL_NUCLEAR
100000003: QUEST 03: DEFEND_CONVOY_AUTO
100000004: QUEST 04: SUPERTANK
100000005: QUEST 05: ASSAULT_CONVOY
100000006: QUEST 06: AIRSTRIKE
100000007: QUEST 07: SHIP
100000008: QUEST 08: ROCKET
100000009: QUEST 09: LABORATORIES
100000010: QUEST 10: SPECIAL_OPS
100000011: QUEST 11: SAVE_VILLAGES
100000012: QUEST 12: TANKBOSS
100000013: QUEST 13: TYRANNOSAURUS
100000014: QUEST 14: SPY_2
100000017-100000025: Various HARDCORE quests
100000049: QUEST: WEEKLY_01
100000100: QUEST: DEFEND_CONVOY
```

---

## 8. Map Coordinates

- Grid starts at (0, 0) top-left
- Expansions unlock additional grid cells
- Typical village: 16x16 base, expands to 24x24

---

## Phase 0 Complete

Done when: All endpoints, 50+ commands, and data structures documented above.

*Document Version: 1.0*
*Generated: 2026-04-18*