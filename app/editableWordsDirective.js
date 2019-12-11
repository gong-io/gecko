import uuidv4 from 'uuid/v4'
import angular from 'angular'

import GeckoEditor from './geckoEditor'

export function editableWordsDirective ($timeout, eventBus) {
    return {
        restrict: 'E',
        scope: {
            fileIndex: '=',
            region: '=',
            proofReading: '='
        },
        link: function (scope, element, attrs) {
            const editor = new GeckoEditor(element[0], scope.fileIndex)
            const editableUuid = uuidv4()

            scope.originalWords = []
            scope.previousState = []

            eventBus.on('resetEditableWords', (region, uuid) => {
                if (uuid && uuid === editableUuid) {
                    return
                }
                if (scope.region) {
                    if (!region || (region && region.id === scope.region.id)) {
                        editor.setRegion(scope.region)
                    }
                }
            }, editableUuid)

            eventBus.on('cleanEditableDOM', (fileIndex) => {
                if (scope.proofReading) {
                    return
                }
                if (fileIndex == scope.fileIndex) {
                    editor.reset()
                }
            }, editableUuid)

            editor.on('wordsUpdated', (newWords, previousWords) => {
                $timeout(() => {
                    scope.region.data.words = newWords
                    if(!angular.equals(newWords, previousWords)) {
                        $timeout(() => {
                            eventBus.trigger('regionTextChanged', scope.region.id)
                            eventBus.trigger('resetEditableWords', scope.region, editableUuid)
                        })
                    }
                })
            })

            editor.on('wordClick', ({ word, event }) => {
                $timeout(() => {
                    eventBus.trigger('wordClick', word, event)
                })
            })

            editor.on('focus', () => {
                eventBus.trigger('editableFocus', scope.region, scope.fileIndex)
            })

            scope.$on('$destroy', function() {
                eventBus.removeListener(editableUuid)
                editor.destroy()
            })
        } 
    }
}