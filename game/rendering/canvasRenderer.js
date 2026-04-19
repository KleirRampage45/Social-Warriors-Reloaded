import { EventBus } from '../core/eventBus.js';

export class CanvasRenderer {
    constructor(canvas, eventBus) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.eventBus = eventBus;
        this.width = 0;
        this.height = 0;
        this.tileWidth = 64;
        this.tileHeight = 64;
        this.gridWidth = 12;
        this.gridHeight = 8;
        this.offsetX = 0;
        this.offsetY = 0;
        this.hoverCell = null;
        this.resources = { gold: 100, wood: 50, oil: 25, steel: 10 };
        this.mapData = null;

        this._init();
        this._setupEventListeners();
    }

    _init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    _setupEventListeners() {
        this.canvas.addEventListener('mousemove', (e) => this._handleMouseMove(e));
        this.canvas.addEventListener('click', (e) => this._handleClick(e));
        this.canvas.addEventListener('mousedown', (e) => this._handleMouseDown(e));
        this.canvas.addEventListener('mouseup', (e) => this._handleMouseUp(e));

        this.eventBus.on('resources:changed', (resources) => {
            this.resources = resources;
        });

        this.eventBus.on('map:loaded', (mapData) => {
            this.mapData = mapData;
            if (mapData) {
                this.gridWidth = mapData.width || 12;
                this.gridHeight = mapData.height || 8;
            }
        });

        this.eventBus.on('game:update', () => this._update());
    }

    resize() {
        const parent = this.canvas.parentElement;
        this.width = parent.clientWidth;
        this.height = parent.clientHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        const gridPixelWidth = this.gridWidth * this.tileWidth;
        const gridPixelHeight = this.gridHeight * this.tileHeight;

        this.offsetX = Math.floor((this.width - gridPixelWidth) / 2);
        this.offsetY = Math.floor((this.height - gridPixelHeight) / 2) + 50;

        this.eventBus.emit('render:resized', {
            width: this.width,
            height: this.height,
        });
    }

    _handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.hoverCell = this.screenToGrid(x, y);
        this.eventBus.emit('render:mousemove', {
            screen: { x, y },
            grid: this.hoverCell,
        });
    }

    _handleClick(e) {
        if (!this.hoverCell) return;

        this.eventBus.emit('render:click', {
            grid: this.hoverCell,
        });
    }

    _handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.eventBus.emit('render:mousedown', {
            x,
            y,
            button: e.button,
            grid: this.screenToGrid(x, y),
        });
    }

    _handleMouseUp(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.eventBus.emit('render:mouseup', {
            x,
            y,
            button: e.button,
            grid: this.screenToGrid(x, y),
        });
    }

    render() {
        this._clear();
        this._renderBackground();
        this._renderGrid();
        this._renderBuildings();
        this._renderHover();
        this._renderUI();
    }

    _clear() {
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    _renderBackground() {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(0.5, '#16213e');
        gradient.addColorStop(1, '#0f3460');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ctx.fillStyle = 'rgba(15, 52, 96, 0.5)';
        this.ctx.fillRect(
            this.offsetX - 50,
            this.offsetY - 50,
            this.gridWidth * this.tileWidth + 100,
            this.gridHeight * this.tileHeight + 100
        );
    }

    _renderGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        this.ctx.lineWidth = 1;

        for (let x = 0; x <= this.gridWidth; x++) {
            const screenPos = this.gridToScreen(x, 0);
            this.ctx.beginPath();
            this.ctx.moveTo(screenPos.x, screenPos.y);
            this.ctx.lineTo(screenPos.x, screenPos.y + this.gridHeight * this.tileHeight);
            this.ctx.stroke();
        }

        for (let y = 0; y <= this.gridHeight; y++) {
            const screenPos = this.gridToScreen(0, y);
            this.ctx.beginPath();
            this.ctx.moveTo(screenPos.x, screenPos.y);
            this.ctx.lineTo(screenPos.x + this.gridWidth * this.tileWidth, screenPos.y);
            this.ctx.stroke();
        }

        this.ctx.strokeStyle = 'rgba(233, 69, 96, 0.4)';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(
            this.offsetX,
            this.offsetY,
            this.gridWidth * this.tileWidth,
            this.gridHeight * this.tileHeight
        );
    }

    _renderBuildings() {
        if (!this.mapData?.grid) return;

        for (let i = 0; i < this.mapData.grid.length; i++) {
            const item = this.mapData.grid[i];
            if (!item) continue;

            const screenPos = this.gridToScreen(item.x, item.y);
            const config = this.mapData.items?.[item.id];

            const width = (config?.width || 1) * this.tileWidth;
            const height = (config?.height || 1) * this.tileHeight;

            const buildingColor = this._getBuildingColor(item.id);
            this.ctx.fillStyle = buildingColor;
            this.ctx.fillRect(
                screenPos.x + 2,
                screenPos.y + 2,
                width - 4,
                height - 4
            );

            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(
                screenPos.x + 2,
                screenPos.y + 2,
                width - 4,
                height - 4
            );

            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 10px "Segoe UI", sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(
                String(item.id),
                screenPos.x + width / 2,
                screenPos.y + height / 2
            );

            if (item.level && item.level > 1) {
                this.ctx.fillStyle = '#ffd700';
                this.ctx.font = 'bold 8px "Segoe UI", sans-serif';
                this.ctx.fillText(
                    `Lv${item.level}`,
                    screenPos.x + width / 2,
                    screenPos.y + height - 12
                );
            }
        }
    }

    _getBuildingColor(itemId) {
        const id = parseInt(itemId) || 0;
        if (id >= 1 && id <= 10) return '#ef4444';
        if (id >= 11 && id <= 20) return '#22c55e';
        if (id >= 21 && id <= 30) return '#3b82f6';
        if (id >= 31 && id <= 40) return '#a855f7';
        if (id >= 41 && id <= 50) return '#f59e0b';
        if (id >= 51 && id <= 60) return '#ec4899';
        if (id >= 61 && id <= 70) return '#14b8a6';
        return '#6366f1';
    }

    _renderHover() {
        if (!this.hoverCell) return;

        const screenPos = this.gridToScreen(this.hoverCell.x, this.hoverCell.y);
        this.ctx.fillStyle = 'rgba(233, 69, 96, 0.3)';
        this.ctx.fillRect(
            screenPos.x,
            screenPos.y,
            this.tileWidth,
            this.tileHeight
        );

        this.ctx.strokeStyle = '#e94560';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(
            screenPos.x,
            screenPos.y,
            this.tileWidth,
            this.tileHeight
        );
    }

    _renderUI() {
        const barHeight = 60;
        const barGradient = this.ctx.createLinearGradient(0, 0, 0, barHeight);
        barGradient.addColorStop(0, 'rgba(26, 26, 46, 0.98)');
        barGradient.addColorStop(1, 'rgba(22, 33, 62, 0.98)');
        this.ctx.fillStyle = barGradient;
        this.ctx.fillRect(0, 0, this.width, barHeight);

        this.ctx.strokeStyle = 'rgba(233, 69, 96, 0.4)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, barHeight);
        this.ctx.lineTo(this.width, barHeight);
        this.ctx.stroke();

        this.ctx.fillStyle = '#e94560';
        this.ctx.font = 'bold 20px "Segoe UI", sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('SOCIAL WARRIORS', 20, barHeight / 2);

        this._renderResourceBar(150, barHeight / 2);
        this._renderLevelBar();
    }

    _renderResourceBar(x, y) {
        const resources = [
            { label: 'Gold', value: this.resources.gold || 0, color: '#ffd700' },
            { label: 'Wood', value: this.resources.wood || 0, color: '#a16207' },
            { label: 'Oil', value: this.resources.oil || 0, color: '#374151' },
            { label: 'Steel', value: this.resources.steel || 0, color: '#9ca3af' },
        ];

        this.ctx.font = 'bold 14px "Segoe UI", sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';

        for (const res of resources) {
            this.ctx.fillStyle = res.color;
            this.ctx.fillText(`${res.label}:`, x, y - 8);
            this.ctx.fillStyle = '#fff';
            this.ctx.fillText(String(res.value), x + 60, y - 8);
            x += 140;
        }
    }

    _renderLevelBar() {
        const level = 1;
        const exp = 0;
        const maxExp = 100;

        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 14px "Segoe UI", sans-serif';
        this.ctx.textAlign = 'right';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(`Level ${level}`, this.width - 20, 20);

        const barWidth = 100;
        const barHeight = 8;
        const barX = this.width - 140;
        const barY = 26;

        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);

        const expPercent = Math.min(1, exp / maxExp);
        this.ctx.fillStyle = '#22c55e';
        this.ctx.fillRect(barX, barY, barWidth * expPercent, barHeight);

        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(barX, barY, barWidth, barHeight);
    }

    _update() {
    }

    gridToScreen(gridX, gridY) {
        return {
            x: this.offsetX + gridX * this.tileWidth,
            y: this.offsetY + gridY * this.tileHeight,
        };
    }

    screenToGrid(screenX, screenY) {
        const x = Math.floor((screenX - this.offsetX) / this.tileWidth);
        const y = Math.floor((screenY - this.offsetY) / this.tileHeight);

        if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) {
            return null;
        }

        return { x, y };
    }

    getTileAt(screenX, screenY) {
        return this.screenToGrid(screenX, screenY);
    }

    getTilePosition(tileX, tileY) {
        return this.gridToScreen(tileX, tileY);
    }
}