
class Debounce {
    constructor ($timeout, $q) {
        this.$timeout = $timeout
        this.$q = $q
    }

    throttle (func, wait, context) {
        let inThrottle
        let deferred = this.$q.defer()
        return () => {
            const args = arguments
            if (!inThrottle) {
                deferred.resolve(func.apply(context, args))
                deferred = this.$q.defer()
                inThrottle = true
                this.$timeout(() => inThrottle = false, wait)
            }

            return deferred.promise
        }
    }
}

export default Debounce