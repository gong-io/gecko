
class Store {
    constructor () {
        this.control = null
    }

    setValue (value, payload) {
        this[value] = payload
    }

    getValue (value) {
        return this[value]
    }
}

export default Store