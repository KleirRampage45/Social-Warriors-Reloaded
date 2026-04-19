import { EventBus } from '../core/eventBus.js';

export class CanvasRenderer {
    constructor(canvas, eventBus) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.eventBus = eventBus;
        this.width = 0;
        this.height = 0;
        this.layers = {
            background: null,
            game: null,
            ui: null,
        };
        this.selectedBuilding = null;
        this.mousePosition = { x: 0, y: 0 };

        this.tileWidth = 64;
        this.tileHeight = 64;

        this._init();
        this._setupEventListeners();
    }

    _init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    _setupEventListeners() {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mousePosition = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            };
            this.eventBus.emit('render:mousemove', this.mousePosition);
        });

        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const position = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            };
            this.eventBus.emit('render:click', position);
        });

        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const position = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                button: e.button,
            };
            this.eventBus.emit('render:mousedown', position);
        });

        this.canvas.addEventListener('mouseup', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const position = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                button: e.button,
            };
            this.eventBus.emit('render:mouseup', position);
        });

        this.eventBus.on('game:update', () => this._update());
    }

    resize() {
        const parent = this.canvas.parentElement;
        this.width = parent.clientWidth;
        this.height = parent.clientHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.eventBus.emit('render:resized', { width: this.width, height: this.height });
    }

    render() {
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this._renderBackground();
        this._renderGrid();
        this._renderGame();
        this._renderUI();
    }

    _renderBackground() {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    _renderGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;

        for (let x = 0; x <= this.width; x += this.tileWidth) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }

        for (let y = 0; y <= this.height; y += this.tileHeight) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }
    }

    _renderGame() {
    }

    _renderUI() {
        const padding = 20;
        const barHeight = 50;

        const gradient = this.ctx.createLinearGradient(0, 0, 0, barHeight);
        gradient.addColorStop(0, 'rgba(26, 26, 46, 0.95)');
        gradient.addColorStop(1, 'rgba(22, 33, 62, 0.95)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, barHeight);

        this.ctx.strokeStyle = 'rgba(233, 69, 96, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, barHeight);
        this.ctx.lineTo(this.width, barHeight);
        this.ctx.stroke();

        this.ctx.font = 'bold 18px "Segoe UI", sans-serif';
        this.ctx.textBaseline = 'middle';

        this._renderResource(20, '#ffd700', 'Gold', '100');
        this._renderResource(120, '#8b4513', 'Wood', '50');
        this._renderResource(220, '#1a1a1a', 'Oil', '25');
        this._renderResource(320, '#708090', 'Steel', '10');
    }

    _renderResource(x, color, label, value) {
        this.ctx.fillStyle = color;
        this.ctx.font = 'bold 16px "Segoe UI", sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`${label}: ${value}`, x, 28);
    }

    _update() {
    }

    getTileAt(x, y) {
        return {
            x: Math.floor(x / this.tileWidth),
            y: Math.floor(y / this.tileHeight),
        };
    }

    getTilePosition(tileX, tileY) {
        return {
            x: tileX * this.tileWidth,
            y: tileY * this.tileHeight,
        };
    }
}