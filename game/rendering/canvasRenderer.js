import { emit, on } from '../core/eventBus.js';
import { getTileSize, getGridSize, gridToScreen } from '../core/engine.js';

let canvas = null;
let ctx = null;
let offsetX = 0;
let offsetY = 0;
let scale = 1;
let selectedItem = null;
let hoverCell = null;

const LAYERS = {
    BACKGROUND: 0,
    GRID: 1,
    BUILDINGS: 2,
    UNITS: 3,
    EFFECTS: 4,
    UI: 5
};

export function init(canvasElement) {
    canvas = canvasElement;
    ctx = canvas.getContext('2d');

    resize();

    window.addEventListener('resize', resize);

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);

    emit('renderer:ready', {});
}

function resize() {
    if (!canvas) return;
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    const { width, height } = getGridSize();
    const tileSize = getTileSize();
    const gridWidth = width * tileSize;
    const gridHeight = height * tileSize;

    offsetX = Math.floor((canvas.width - gridWidth) / 2);
    offsetY = Math.floor((canvas.height - gridHeight) / 2);
}

function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const tileSize = getTileSize();
    const gridX = Math.floor((x - offsetX) / tileSize);
    const gridY = Math.floor((y - offsetY) / tileSize);

    const { width, height } = getGridSize();

    if (gridX >= 0 && gridX < width && gridY >= 0 && gridY < height) {
        hoverCell = { x: gridX, y: gridY };
    } else {
        hoverCell = null;
    }
}

function handleClick(e) {
    if (!hoverCell) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const tileSize = getTileSize();
    const gridX = Math.floor((x - offsetX) / tileSize);
    const gridY = Math.floor((y - offsetY) / tileSize);

    emit('map:click', { x: gridX, y: gridY, screenX: x, screenY: y });
}

export function render(mapData) {
    if (!ctx || !canvas) return;

    clear();

    drawGrid();

    if (mapData?.items) {
        drawItems(mapData.items);
    }

    if (hoverCell) {
        drawHover(hoverCell);
    }
}

function clear() {
    ctx.fillStyle = '#0f3460';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawGrid() {
    const { width, height } = getGridSize();
    const tileSize = getTileSize();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= width; x++) {
        const pos = gridToScreen(x, 0, offsetX, offsetY);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(pos.x, pos.y + height * tileSize);
        ctx.stroke();
    }

    for (let y = 0; y <= height; y++) {
        const pos = gridToScreen(0, y, offsetX, offsetY);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(pos.x + width * tileSize, pos.y);
        ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(233, 69, 96, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX, offsetY, width * tileSize, height * tileSize);
}

function drawItems(items) {
    for (const [index, item] of Object.entries(items)) {
        const [itemId, x, y, timestamp, orientation, queue, attr, player] = item;

        drawItem(itemId, x, y, player);
    }
}

function drawItem(itemId, x, y, player) {
    const pos = gridToScreen(x, y, offsetX, offsetY);
    const tileSize = getTileSize();

    ctx.fillStyle = player === 1 ? '#4ade80' : '#f87171';
    ctx.fillRect(pos.x + 4, pos.y + 4, tileSize - 8, tileSize - 8);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(itemId), pos.x + tileSize / 2, pos.y + tileSize / 2);
}

function drawHover(cell) {
    const pos = gridToScreen(cell.x, cell.y, offsetX, offsetY);
    const tileSize = getTileSize();

    ctx.fillStyle = 'rgba(233, 69, 96, 0.3)';
    ctx.fillRect(pos.x, pos.y, tileSize, tileSize);

    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 2;
    ctx.strokeRect(pos.x, pos.y, tileSize, tileSize);
}

export function setScale(newScale) {
    scale = Math.max(0.5, Math.min(2, newScale));
}

export function getOffset() {
    return { offsetX, offsetY };
}

export function getHoverCell() {
    return hoverCell;
}

export function screenToGrid(screenX, screenY) {
    const tileSize = getTileSize();
    const x = Math.floor((screenX - offsetX) / tileSize);
    const y = Math.floor((screenY - offsetY) / tileSize);
    const { width, height } = getGridSize();

    if (x < 0 || x >= width || y < 0 || y >= height) {
        return null;
    }
    return { x, y };
}