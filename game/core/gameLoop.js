export class GameLoop {
    constructor(eventBus, renderer) {
        this.eventBus = eventBus;
        this.renderer = renderer;
        this.running = false;
        this.lastTime = 0;
        this.deltaTime = 0;
        this.accumulator = 0;
        this.fixedTimeStep = 1000 / 60;
        this.animationFrameId = null;
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.lastTime = performance.now();
        this.tick(this.lastTime);
        this.eventBus.emit('game:started');
    }

    stop() {
        this.running = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.eventBus.emit('game:stopped');
    }

    tick(currentTime) {
        if (!this.running) return;

        this.deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        this.accumulator += this.deltaTime;

        while (this.accumulator >= this.fixedTimeStep) {
            this.update(this.fixedTimeStep);
            this.accumulator -= this.fixedTimeStep;
        }

        this.render();
        this.eventBus.emit('game:tick', { deltaTime: this.deltaTime });

        this.animationFrameId = requestAnimationFrame((t) => this.tick(t));
    }

    update(dt) {
        this.eventBus.emit('game:update', { deltaTime: dt });
    }

    render() {
        if (this.renderer) {
            this.renderer.render();
        }
    }
}