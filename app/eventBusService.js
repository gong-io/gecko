class EventBus {
    constructor () {
        console.log('eb constr')
    }
    setEvent (key, cb) {
        this[key] = cb
    }

    callEvent (key, ...args) {
        if (this[key]) {
            this[key](...args)
        }
    }
}

export default EventBus