import { emit } from './eventBus.js';
import { applyResources, mapAddItem, mapGetItem, mapDeleteItem, mapPopItem, addStoreItem, removeStoreItem, timestampNow, mapAddItemFromItem } from './engine.js';

let currentSave = null;
let currentMap = null;

export function setCurrentSave(save) {
    currentSave = save;
    currentMap = save?.maps?.[save.playerInfo?.default_map || 0] || null;
}

export function executeCommand(data) {
    if (!currentSave) {
        console.error('No save loaded');
        return false;
    }

    const { first_number, publishActions, ts, tries, accessToken, commands } = data;

    for (const [map_id, cmd, args, resources_changed] of commands) {
        doCommand(map_id, cmd, args, resources_changed);
    }

    emit('save:modified', currentSave);
    return true;
}

function doCommand(map_id, cmd, args, resources_changed) {
    if (!currentMap) return;

    const now = timestampNow();

    if (resources_changed && resources_changed.length > 0) {
        applyResources(currentSave, currentMap, resources_changed);
    }

    switch (cmd) {
        case 'buy': {
            const [item_index, item_id, x, y, playerID, orientation, unknown, reason] = args;
            mapAddItem(currentMap, item_index, item_id, x, y, orientation, now, {}, [], playerID);
            console.log(`[BUY] Item ${item_id} at (${x},${y})`);
            break;
        }

        case 'sell': {
            const [item_index, reason] = args;
            const item = mapGetItem(currentMap, item_index);
            if (item) mapDeleteItem(currentMap, item_index);
            console.log(`[SELL] Item at index ${item_index}`);
            break;
        }

        case 'kill': {
            const [item_index, reason] = args;
            const item = mapGetItem(currentMap, item_index);
            if (item) mapDeleteItem(currentMap, item_index);
            console.log(`[KILL] Item at index ${item_index}`);
            break;
        }

        case 'move': {
            const [item_index, x, y, frame, string] = args;
            const item = mapGetItem(currentMap, item_index);
            if (item) {
                item[1] = x;
                item[2] = y;
            }
            console.log(`[MOVE] Item ${item_index} to (${x},${y})`);
            break;
        }

        case 'collect': {
            const [item_index] = args;
            const item = mapGetItem(currentMap, item_index);
            if (item) {
                item[3] = now;
            }
            console.log(`[COLLECT] Item ${item_index}`);
            break;
        }

        case 'orient': {
            const [item_index, orientation] = args;
            const item = mapGetItem(currentMap, item_index);
            if (item) {
                item[4] = orientation;
            }
            console.log(`[ORIENT] Item ${item_index} = ${orientation}`);
            break;
        }

        case 'expand': {
            const [expansion] = args;
            if (!currentMap.expansions) currentMap.expansions = [];
            currentMap.expansions.push(expansion);
            console.log(`[EXPAND] ${expansion}`);
            break;
        }

        case 'store_item': {
            const [item_index] = args;
            const item = mapPopItem(currentMap, item_index);
            if (item) {
                addStoreItem(currentMap, item[0]);
            }
            console.log(`[STORE_ITEM] Item ${item_index}`);
            break;
        }

        case 'place_stored_item': {
            const [item_index, item_id, x, y, playerID, orientation, autoactivable, imgIndex] = args;
            removeStoreItem(currentMap, item_id);
            mapAddItem(currentMap, item_index, item_id, x, y, orientation, now, {}, [], playerID);
            console.log(`[PLACE_STORED_ITEM] Item ${item_id} at (${x},${y})`);
            break;
        }

        case 'sell_stored_item': {
            const [item_id] = args;
            removeStoreItem(currentMap, item_id);
            console.log(`[SELL_STORED_ITEM] Item ${item_id}`);
            break;
        }

        case 'store_add_items': {
            const [item_id_list] = args;
            for (const item_id of item_id_list) {
                addStoreItem(currentMap, item_id);
            }
            console.log(`[STORE_ADD_ITEMS] ${item_id_list.join(', ')}`);
            break;
        }

        case 'level_up': {
            const [new_level] = args;
            currentMap.level = new_level;
            console.log(`[LEVEL_UP] ${new_level}`);
            break;
        }

        case 'complete_tutorial': {
            const [tutorial_step] = args;
            currentSave.playerInfo.completed_tutorial = tutorial_step >= 25 || tutorial_step === 15 ? 1 : 0;
            console.log(`[COMPLETE_TUTORIAL] Step ${tutorial_step}`);
            break;
        }

        case 'set_quest_var': {
            const [key, value] = args;
            if (!currentMap.currentQuestVars) currentMap.currentQuestVars = {};
            currentMap.currentQuestVars[key] = value;
            if (key === 'id') currentMap.idCurrentMission = value;
            console.log(`[SET_QUEST_VAR] ${key} = ${value}`);
            break;
        }

        case 'collect_mission': {
            let [next_mission] = args;
            if (next_mission > 99) next_mission = 1;
            currentMap.idCurrentMission = String(next_mission);
            currentMap.timestampLastChapter = now;
            currentMap.currentQuestVars = {};
            console.log(`[COLLECT_MISSION] ${next_mission}`);
            break;
        }

        case 'weekly_reward': {
            const privateState = currentSave.privateState;
            const [item_index, item_id, x, y, playerID] = args;
            if (item_id) {
                mapAddItem(currentMap, item_index, item_id, x, y, 0, now, {}, [], playerID);
            }
            privateState.timeStampMondayBonus = now;
            privateState.weeklyRewardIndex = ((privateState.weeklyRewardIndex || 0) + 1) % 10;
            console.log(`[WEEKLY_REWARD]`);
            break;
        }

        case 'win_daily_bonus': {
            const [item, next_id] = args;
            const privateState = currentSave.privateState;
            privateState.timestampLastBonus = now;
            privateState.bonusNextId = next_id > 5 ? 1 : next_id;
            if (item > 0) {
                addStoreItem(currentMap, item);
            }
            console.log(`[WIN_DAILY_BONUS] Item ${item}`);
            break;
        }

        case 'trade_resource': {
            const [resource_type, sold] = args;
            currentMap.numTradesDone = Math.min(20, (currentMap.numTradesDone || 0) + 1);
            currentMap.timestampLastTrade = now;
            console.log(`[TRADE_RESOURCE] ${currentMap.numTradesDone}/20`);
            break;
        }

        case 'flash_debug': {
            const [cash, unknown, xp, gold, oil, steel, wood] = args;
            currentSave.playerInfo.cash = cash;
            currentMap.xp = xp;
            currentMap.gold = gold;
            currentMap.oil = oil;
            currentMap.steel = steel;
            currentMap.wood = wood;
            console.log(`[FLASH_DEBUG] Synced resources`);
            break;
        }

        case 'next_research_step': {
            const [_type] = args;
            const privateState = currentSave.privateState;
            if (!privateState.researchStepNumber) privateState.researchStepNumber = [0, 0];
            privateState.researchStepNumber[_type] += 1;
            if (!privateState.timeStampDoResearch) privateState.timeStampDoResearch = [0, 0];
            privateState.timeStampDoResearch[_type] = now;
            console.log(`[NEXT_RESEARCH_STEP] Type ${_type}`);
            break;
        }

        case 'research_buy_step_cash': {
            const [cash, _type] = args;
            const privateState = currentSave.privateState;
            if (!privateState.timeStampDoResearch) privateState.timeStampDoResearch = [0, 0];
            privateState.timeStampDoResearch[_type] = 0;
            console.log(`[RESEARCH_BUY_STEP_CASH] Type ${_type}`);
            break;
        }

        case 'next_research_item': {
            const [_type] = args;
            const privateState = currentSave.privateState;
            if (!privateState.researchItemNumber) privateState.researchItemNumber = [0, 0];
            if (!privateState.researchStepNumber) privateState.researchStepNumber = [0, 0];
            if (!privateState.timeStampDoResearch) privateState.timeStampDoResearch = [0, 0];
            privateState.researchItemNumber[_type] += 1;
            privateState.researchStepNumber[_type] = 0;
            privateState.timeStampDoResearch[_type] = 0;
            console.log(`[NEXT_RESEARCH_ITEM] Type ${_type}`);
            break;
        }

        case 'reset_research_item': {
            const [_type] = args;
            const privateState = currentSave.privateState;
            if (!privateState.researchItemNumber) privateState.researchItemNumber = [0, 0];
            if (!privateState.researchStepNumber) privateState.researchStepNumber = [0, 0];
            if (!privateState.timeStampDoResearch) privateState.timeStampDoResearch = [0, 0];
            privateState.researchItemNumber[_type] = 0;
            privateState.researchStepNumber[_type] = 0;
            privateState.timeStampDoResearch[_type] = 0;
            console.log(`[RESET_RESEARCH_ITEM] Type ${_type}`);
            break;
        }

        case 'fast_forward': {
            const [seconds] = args;
            currentMap.timestamp = Math.max(0, currentMap.timestamp - seconds);
            currentMap.timestampLastChapter = Math.max(0, currentMap.timestampLastChapter - seconds);
            currentMap.timestampLastTreasure = Math.max(0, currentMap.timestampLastTreasure - seconds);
            currentMap.timestampLastTrade = Math.max(0, currentMap.timestampLastTrade - seconds);
            console.log(`[FAST_FORWARD] ${seconds}s`);
            break;
        }

        case 'activate': {
            const [item_index, activate] = args;
            const item = mapGetItem(currentMap, item_index);
            if (item) {
                item[3] = now;
                if (activate > 0) {
                    if (!item[6]) item[6] = {};
                    item[6].cp = activate;
                } else {
                    item[6] = {};
                }
            }
            console.log(`[ACTIVATE] Item ${item_index}`);
            break;
        }

        case 'push_unit': {
            const [index_unit, index_building] = args;
            const unit = mapPopItem(currentMap, index_unit);
            const building = mapGetItem(currentMap, index_building);
            if (unit && building) {
                if (!building[5]) building[5] = [];
                building[5].push(unit);
                building[3] = now;
            }
            console.log(`[PUSH_UNIT] To building ${index_building}`);
            break;
        }

        case 'pop_unit': {
            const [index_building, index_unit, item_id, x, y, playerID, unknown] = args;
            const building = mapGetItem(currentMap, index_building);
            if (building && building[5] && building[5].length > 0) {
                const unit = building[5].shift();
                mapAddItem(currentMap, index_unit, unit[0], x, y, 0, now, unit[6] || {}, [], playerID);
            }
            console.log(`[POP_UNIT] From building ${index_building}`);
            break;
        }

        case 'ping': {
            console.log('[PONG]');
            break;
        }

        case 'set_variables': {
            console.log('[SET_VARIABLES]');
            break;
        }

        default:
            console.log(`[UNKNOWN_CMD] ${cmd}:`, args);
    }
}

export function getCurrentSave() {
    return currentSave;
}

export function getCurrentMap() {
    return currentMap;
}