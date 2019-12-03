class EventBus {
    constructor ($timeout) {
        this.listeners = new Map()
        this.$timeout = $timeout
    }

    on (label, callback) {
        this.listeners.has(label) || this.listeners.set(label, [])
        this.listeners.get(label).push(callback)
    }

    trigger (label, ...args) {
        let res = false
        const _trigger = (inListener, label, ...args) => {
            let listeners = inListener.get(label)
            if (listeners && listeners.length) {
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