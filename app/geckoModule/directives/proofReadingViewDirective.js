const templateUrl = require('ngtemplate-loader?requireAngular!html-loader!../templates/proofReadingViewTemplate.html')

export const proofReadingViewDirective = ($timeout, eventBus) => {
    return {
        restrict: 'E',
        templateUrl,
        scope: {
            fileIndex: '=',
            regions: '=',
            selectedRegion: '=',
            legend: '='
        },
        link: (scope, element, attrs) => {
            scope.isReady = false

            scope.rebuildProofReading = (selectedRegion, fileIndex) => {
                if (scope.fileIndex === fileIndex || (!fileIndex && fileIndex !== 0)) {
                    for (let i = 0, l = scope.regions.length; i < l; i++) {
                        for (let j = 0, lMerged = scope.regions[i].length; j < lMerged; j++) {
                            eventBus.trigger('resetEditableWords', scope.regions[i][j])
                        }
                    }
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
                currentSelected.forEach((n) => {
                    n.classList.remove('proofreading--selected')
                })

                if (!scope.selectedRegion) {
                    return
                }

                const regionElement = document.querySelector(`[data-region="${scope.selectedRegion.id}"]`)
                if (regionElement) {
                    const topAncestor = findTopAncestor(regionElement)
                    topAncestor.classList.add('proofreading--selected')
                } 
            }

            scope.$watch('selectedRegion', (newVal) => {
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