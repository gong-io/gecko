const templateUrl = require('ngtemplate-loader?requireAngular!html-loader!../static/templates/proofReadingView.html')

export function proofReadingViewDirective ($timeout) {
    return {
        restrict: 'E',
        templateUrl,
        scope: {
            fileIndex: '=',
            wordClick: '&',
            wordChanged: '&',
            regionTextChanged: '&',
            control: '='
        },
        link: function (scope, element, attrs) {
            scope.regions = []
            scope.control.iterateRegions((r) => {
                scope.regions.push(r)
            }, scope.fileIndex)
        }
    }
}