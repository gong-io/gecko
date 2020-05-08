// Create an AngularJS service called debounce
class Debounce {
    constructor ($timeout, $q) {
        this.$timeout = $timeout
        this.$q = $q
    }

    debounce (func, wait, immediate) {
        var timeout;
        // Create a deferred object that will be resolved when we need to
        // actually call the func
        var deferred = $q.defer();
        return function() {
            var context = this, args = arguments;
            var later = function() {
            timeout = null;
            if(!immediate) {
                deferred.resolve(func.apply(context, args));
                deferred = $q.defer();
            }
            };
            var callNow = immediate && !timeout;
            if ( timeout ) {
            $timeout.cancel(timeout);
            }
            timeout = $timeout(later, wait);
            if (callNow) {
            deferred.resolve(func.apply(context,args));
            deferred = $q.defer();
            }
            return deferred.promise;
        }
    }
}

export default Debounce