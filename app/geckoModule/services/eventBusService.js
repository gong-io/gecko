import { v4 as uuidv4 } from 'uuid';

class EventBus {
    constructor ($timeout) {
        this.listeners = new Map()
        this.$timeout = $timeout
    }

    on (label, callback, listenerUuid) {
        listenerUuid = listenerUuid || uuidv4()
        this.listeners.has(label) || this.listeners.set(label, new Map())
        this.listeners.get(label).set(listenerUuid, callback)
    }

    removeListener (uuid) {
        this.listeners.forEach(l => {
            if (l.has(uuid)) {
                l.delete(uuid)
            }
        })
    }

    trigger (label, ...args) {
        let res = false
        const _trigger = (inListener, label, ...args) => {
            let listeners = inListener.get(label)
            if (listeners && listeners.size) {
                listeners.forEach((listener) => {
                    listener(...args)
                });
                res = true
            }
        };

        this.$timeout(() => {
            _trigger(this.listeners, label, ...args)
        })
        return res
    }
}

export default EventBus