const templateUrl = require('ngtemplate-loader?requireAngular!html-loader!../static/templates/proofReadingView.html')

export function proofReadingViewDirective ($timeout, eventBus) {
    return {
        restrict: 'E',
        templateUrl,
        scope: {
            fileIndex: '=',
            regions: '=',
            currentRegion: '=',
            legend: '='
        },
        link: function (scope, element, attrs) {
            scope.isReady = false

            scope.rebuildProofReading = () => {
                console.log('rebuild', scope.regions)
                scope.regions.forEach((merged) => {
                    merged.forEach((r) => {
                        eventBus.trigger('resetEditableWords', r)
                    })
                })
            }

            scope.$watch('regions', (newVal) => {
                if (newVal && newVal.length && !scope.isReady) {
                    scope.rebuildProofReading()
                    scope.isReady = true
                }
            })

            eventBus.on('rebuildProofReading', () => {
                scope.rebuildProofReading()
            })

            eventBus.on('proofReadingScrollToSelected', () => {
                document.querySelectorAll('.proofreading--selected').forEach((n) => {
                    if (n) {
                        element[0].parentNode.scrollTop = n.offsetTop - 36
                    }
                })
            })

            eventBus.on('proofReadingScrollToRegion', (region) => {
                const regionElement = document.querySelector(`[data-region="${region.id}"]`)
                if (regionElement) {
                    element[0].parentNode.scrollTop = regionElement.offsetTop - 36
                }
            }) 

            /* eventBus.on('proofReadingScroll', (region, fileIndex) => {
                if (fileIndex !== scope.fileIndex) {
                    const regionElement = document.querySelector(`[data-region="${region.id}"]`)
                    if (regionElement) {
                        element[0].parentNode.scrollTop = regionElement.offsetTop - 36
                    }
                }
            }) */
        }
    }
}