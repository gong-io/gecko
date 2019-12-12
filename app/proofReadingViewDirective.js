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

            scope.rebuildProofReading = (selectedRegion, fileIndex) => {
                if (scope.fileIndex === fileIndex || (!fileIndex && fileIndex !== 0)) {
                    scope.regions.forEach((merged) => {
                        merged.forEach((r) => {
                            eventBus.trigger('resetEditableWords', r)
                        })
                    })
                }
            }

            scope.$watch('regions', (newVal) => {
                if (newVal && newVal.length && !scope.isReady) {
                    scope.rebuildProofReading()
                    scope.isReady = true
                }
            })

            eventBus.on('rebuildProofReading', (selectedRegion, fileIndex) => {
                scope.rebuildProofReading(selectedRegion, fileIndex)
                scope.setSelected()
            })

            eventBus.on('proofReadingScrollToSelected', () => {
                document.querySelectorAll('.proofreading--selected').forEach((n) => {
                    if (n) {
                        element[0].parentNode.scrollTop = n.offsetTop - 36
                    }
                })
            })

            const findTopAncestor = (el) => {
                while (!el.classList.contains('proofreading')) {
                    el = el.parentNode
                }
                return el
            }

            scope.setSelected = () => {
                const currentSelected = element[0].querySelectorAll('.proofreading--selected')
                if (currentSelected.forEach((n) => {
                    n.classList.remove('proofreading--selected')
                }))

                if (!scope.currentRegion) {
                    return
                }

                const regionElement = document.querySelector(`[data-region="${scope.currentRegion.id}"]`)
                if (regionElement) {
                    const topAncestor = findTopAncestor(regionElement)
                    topAncestor.classList.add('proofreading--selected')
                } 
            }

            scope.$watch('currentRegion', (newVal) => {
                $timeout(() => {
                    scope.setSelected()
                })
            })

            eventBus.on('proofReadingScrollToRegion', (region) => {
                const regionElement = document.querySelector(`[data-region="${region.id}"]`)
                if (regionElement) {
                    const topAncestor = findTopAncestor(regionElement)
                    element[0].parentNode.scrollTop = topAncestor.offsetTop - 36
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