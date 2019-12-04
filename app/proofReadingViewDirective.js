const templateUrl = require('ngtemplate-loader?requireAngular!html-loader!../static/templates/proofReadingView.html')

export function proofReadingViewDirective ($timeout, eventBus) {
    return {
        restrict: 'E',
        templateUrl,
        scope: {
            fileIndex: '=',
            regions: '=',
            currentRegion: '='
        },
        link: function (scope, element, attrs) {
            scope.isReady = false

            scope.$watch('regions', (newVal) => {
                if (newVal && newVal.length && !scope.isReady) {
                    eventBus.trigger('resetEditableWords')
                    scope.isReady = true
                }
            })
        }
    }
}