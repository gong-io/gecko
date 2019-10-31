class EventBus {
    constructor (app) {
        this.app = app
    }

    dispatch (name, data) {
        const event = new CustomEvent(name, { detail: data })
        window.parent.document.dispatchEvent(event)
    }

    listen (name, handler) {
        window.document.addEventListener(name, handler , false)
    }
}

export default EventBus