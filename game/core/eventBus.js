const listeners = new Map();

export function on(event, callback) {
    if (!listeners.has(event)) {
        listeners.set(event, []);
    }
    listeners.get(event).push(callback);
    return () => off(event, callback);
}

export function off(event, callback) {
    const callbacks = listeners.get(event);
    if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
            callbacks.splice(index, 1);
        }
    }
}

export function emit(event, data) {
    const callbacks = listeners.get(event);
    if (callbacks) {
        for (const callback of callbacks) {
            try {
                callback(data);
            } catch (e) {
                console.error(`Error in event handler for "${event}":`, e);
            }
        }
    }
}

export function once(event, callback) {
    const wrapper = (data) => {
        off(event, wrapper);
        callback(data);
    };
    return on(event, wrapper);
}

export function clear(event) {
    if (event) {
        listeners.delete(event);
    } else {
        listeners.clear();
    }
}