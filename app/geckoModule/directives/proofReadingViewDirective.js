const templateUrl = require('ngtemplate-loader?requireAngular!html-loader!../templates/proofReadingViewTemplate.html')

export const proofReadingViewDirective = ($timeout, eventBus, store) => {
    return {
        restrict: 'E',
        templateUrl,
        scope: {
            fileIndex: '=',
            regions: '=',
            selectedRegion: '='
        },
        link: (scope, element, attrs) => {
            eventBus.on('proofReadingScrollToSelected', () => {
                element[0].querySelectorAll('.proofreading--selected').forEach((n) => {
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

                const regionElement = element[0].querySelector(`[data-region="${scope.selectedRegion.id}"]`)
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

            eventBus.on('proofReadingSetSelected', () => {
                scope.setSelected()
            })

            eventBus.on('proofReadingScrollToRegion', (region) => {
                const regionElement = element[0].querySelector(`[data-region="${region.id}"]`)
                if (regionElement) {
                    const topAncestor = findTopAncestor(regionElement)
                    topAncestor.scrollIntoView();
                    element[0].parentNode.scrollTop -= 10;
//                    element[0].parentNode.scrollTop = topAncestor.offsetTop;
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