import uuidv4 from 'uuid/v4'
import angular from 'angular'

import GeckoEditor from '../utils/geckoEditor'

export const editableWordsDirective = ($timeout, eventBus, store) => {
    return {
        restrict: 'E',
        scope: {
            fileIndex: '=',
            region: '=',
            proofReading: '<'
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

            scope.resetEditableWords = (uuid) => {
                editor.setRegion(scope.region)
                checkIsEmpty()
            }

            scope.resetSelected = () => {
                editor.resetSelected()
            }

            scope.setSelected = (uuid) => {
                editor.setSelected(uuid)
            }

            scope.resetFound = () => {
                editor.resetFound()
            }

            scope.setFound = (uuid) => {
                editor.setFound(uuid)
            }

            editor.on('wordsUpdated', (newWords) => {
                scope.region.data.words = newWords
                eventBus.trigger('regionTextChanged', scope.region.id)
                checkIsEmpty()
                const control = store.getValue('control')
                if (control.searchBarView) {
                    control.searchBarUpdate()
                }
            })

            editor.on('wordClick', ({ word, event }) => {
                eventBus.trigger('wordClick', word, event)
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

            const control = store.getValue('control')
            if (scope.proofReading) {
                control.editableWords.set(scope.region.id, scope)
                element[0].setAttribute('data-region', scope.region.id)
            } else {
                control.editableWords.set(`main_${scope.fileIndex}`, scope)
            }

            if (scope.region) {
                editor.setRegion(scope.region)
                checkIsEmpty()
            }

            if (!scope.proofReading) {
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
}