import { emit } from './eventBus.js';

let lastTime = 0;
let accumulator = 0;
let isRunning = false;
let animationFrameId = null;
let fps = 60;
let updateCallback = null;
let renderCallback = null;

const FIXED_TIMESTEP = 1000 / 60;

export function start(update, render, targetFps = 60) {
    if (isRunning) return;
    isRunning = true;
    fps = targetFps;
    updateCallback = update;
    renderCallback = render;
    lastTime = performance.now();
    accumulator = 0;
    loop();
}

export function stop() {
    isRunning = false;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

export function pause() {
    isRunning = false;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

export function resume() {
    if (!isRunning && updateCallback) {
        isRunning = true;
        lastTime = performance.now();
        loop();
    }
}

function loop() {
    if (!isRunning) return;
    animationFrameId = requestAnimationFrame(loop);

    const currentTime = performance.now();
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    accumulator += deltaTime;

    const maxSteps = 10;
    let steps = 0;
    while (accumulator >= FIXED_TIMESTEP && steps < maxSteps) {
        if (updateCallback) {
            updateCallback(FIXED_TIMESTEP / 1000);
        }
        accumulator -= FIXED_TIMESTEP;
        steps++;
    }

    if (accumulator > FIXED_TIMESTEP * 2) {
        accumulator = 0;
    }

    if (renderCallback) {
        renderCallback();
    }

    emit('frame', { deltaTime, fixedSteps: steps });
}

export function getFps() {
    return fps;
}

export function isActive() {
    return isRunning;
}