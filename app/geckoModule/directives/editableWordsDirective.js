import uuidv4 from 'uuid/v4'
import angular from 'angular'

import GeckoEditor from '../utils/geckoEditor'

export const editableWordsDirective = ($timeout, eventBus) => {
    return {
        restrict: 'E',
        scope: {
            fileIndex: '=',
            region: '=',
            proofReading: '=',
            control: '='
        },
        link: (scope, element, attrs) => {
            const editor = new GeckoEditor(element[0], scope.fileIndex)
            const editableUuid = uuidv4()

            scope.originalWords = []
            scope.previousState = []

            const checkIsEmpty = () => {
                if (!element[0].textContent.trim().length) {
                    element[0].classList.add('editable-words--outlined')
                } else {
                    element[0].classList.remove('editable-words--outlined')
                }
            }

            scope.resetEditableWords = (uuid) =>{
                if (uuid && uuid === editableUuid) {
                    return
                }
                editor.setRegion(scope.region)
                checkIsEmpty()
            }

            editor.on('wordsUpdated', (newWords) => {
                scope.region.data.words = newWords
                eventBus.trigger('regionTextChanged', scope.region.id)
                checkIsEmpty()
            })

            editor.on('wordClick', ({ word, event }) => {
                $timeout(() => {
                    eventBus.trigger('wordClick', word, event)
                })
            })

            editor.on('emptyEditorClick', ({ region, event }) => {
                $timeout(() => {
                    eventBus.trigger('emptyEditorClick', region, event)
                })
            })

            editor.on('focus', () => {
                eventBus.trigger('editableFocus', scope.region, scope.fileIndex)
            })

            scope.$on('$destroy', () => {
                eventBus.removeListener(editableUuid)
                editor.destroy()
            })

            if (scope.proofReading) {
                scope.control.editableWords.set(scope.region.id, scope)
            } else {
                scope.control.editableWords.set(`main_${scope.fileIndex}`, scope)
            }

            if (scope.region) {
                editor.setRegion(scope.region)
                checkIsEmpty()
            }

            scope.$watch('region', (newVal, oldVal) => {
                if (newVal && oldVal && newVal.id === oldVal.id) {
                    return
                }
                editor.setRegion(scope.region)
                checkIsEmpty()
            })
        } 
    }
}