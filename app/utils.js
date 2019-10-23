export const jsonStringify = (json) => {
    return JSON.stringify(json, function (key, value) {
        // limit precision of floats
        if (typeof value === 'number') {
            return parseFloat(value.toFixed(2));
        }
        return value;
    })
}