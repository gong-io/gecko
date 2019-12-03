const templateUrl = require('ngtemplate-loader?requireAngular!html-loader!../static/templates/proofReadingView.html')

export function proofReadingViewDirective ($timeout, eventBus) {
    return {
        restrict: 'E',
        templateUrl,
        scope: {
            fileIndex: '=',
            regionTextChanged: '&',
            control: '=',
            regions: '='
        },
        link: function (scope, element, attrs) {
            scope.appControl = scope.control || {}
            scope.isReady = false
            console.log('here', scope.regions)

            scope.$watch('regions', (newVal) => {
                if (newVal && newVal.length && !scope.isReady) {
                    console.log('reset')
                    eventBus.trigger('resetEditableWords')
                    scope.isReady = true
                }
            })
        }
    }
}