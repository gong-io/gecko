import uuidv4 from 'uuid/v4'
import angular from 'angular'

import GeckoEditor from './geckoEditor'

export function editableWordsDirective ($timeout) {
    return {
        restrict: 'E',
        scope: {
            words: '=',
            fileIndex: '=',
            region: '=',
            wordClick: '&',
            wordChanged: '&',
            regionTextChanged: '&',
            control: '='
        },
        link: function (scope, element, attrs) {
            scope.editor = new GeckoEditor(element[0], scope.fileIndex)

            scope.appControl = scope.control || {}
            scope.originalWords = []
            scope.previousState = []

            scope.appControl.resetEditableWords = () => {
                $timeout(() => {
                    scope.editor.setRegion(scope.region)
                })
            }

            scope.appControl.cleanEditableDOM = () => {
                scope.editor.reset()
            }

            scope.editor.on('wordsUpdated', (newWords, previousWords) => {
                $timeout(() => {
                    scope.words = newWords
                    if(!angular.equals(newWords, previousWords)) {
                        $timeout(() => {
                            scope.regionTextChanged({ regionIndex: scope.fileIndex })
                        })
                    }
                })
            })

            /* scope.editor.on('wordChanged', (wordUuid) => {
                $timeout(() => {
                    scope.wordChanged && scope.wordChanged({ regionIndex: scope.fileIndex, wordUuid })
                })
            }) */

            scope.editor.on('wordClick', ({ word, event }) => {
                $timeout(() => {
                    scope.wordClick && scope.wordClick({ word, event })
                })
            })

            
            /* 

            element.bind('paste', (e) => {
                if (e && e.originalEvent) {
                    const clipboardData = e.originalEvent.clipboardData
                    if (clipboardData) {
                        const text = clipboardData.getData('text/plain')
                        if (isAllSelected()) {
                            const pastedWords = text.split(' ')
                            const words = pastedWords.map((w, i) => spanHTML({ uuid: uuidv4(), start: scope.region.start, end: scope.region.end, text: w, index: i}))
                            document.execCommand('insertHTML', false, words.join(spaceSpanHTML))
                        } else {
                            document.execCommand('insertText', false, text)
                        }
                    }
                }
                e.preventDefault()
            })
        */
        } 
    }
}