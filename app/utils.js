export const jsonStringify = (json) => {
    return JSON.stringify(json, function (key, value) {
        // limit precision of floats
        if (typeof value === 'number') {
            return parseFloat(value.toFixed(2));
        }
        return value;
    })
}

export const uuid = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
}