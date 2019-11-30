import uuidv4 from 'uuid/v4'
import angular from 'angular'

import GeckoEditor from './geckoEditor'

const isFirefox = navigator.userAgent.indexOf('Firefox') !== -1

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

            scope.editor.on('wordsUpdated', (newWords) => {
                $timeout(() => {
                    scope.words = newWords
                })
            })

            scope.editor.on('wordChanged', (wordUuid) => {
                $timeout(() => {
                    scope.wordChanged && scope.wordChanged({ regionIndex: scope.fileIndex, wordUuid })
                })
            })

            scope.editor.on('checkRegionUpdated', (words, previousState) => {
                if(!angular.equals(words, previousState)) {
                    $timeout(() => {
                        scope.regionTextChanged({ regionIndex: scope.fileIndex })
                    })
                } 
            })

            scope.editor.on('wordClick', ({ word, event }) => {
                console.log('catch')
                $timeout(() => {
                    scope.wordClick && scope.wordClick({ word, event })
                })
            })

            
            /* element[0].setAttribute('contenteditable', true)

            const spaceSpanHTML = '<span class="segment-text__space"> </span>'

            element.bind('click', (e) => {
                const clickedSpan = window.getSelection().anchorNode.parentNode
                console.log('clicked', clickedSpan)
                if (e.ctrlKey || e.metaKey) {
                    if (clickedSpan && clickedSpan.classList.contains('segment-text__word-wrapper')) {
                        const wordUuid = clickedSpan.getAttribute('word-uuid')
                        const clickedWord = scope.words.find(w => w.uuid === wordUuid)
                        scope.wordClick && scope.wordClick({ word: clickedWord, event: e })
                    }
                }
            })

            const isAllSelected = () => {
                const selection = window.getSelection()
                const selectionStr = selection.toString().trim()
                const contentStr = element[0].textContent.replace(/\n\n/g, ' ').replace(/\n/g, '')
                if (selectionStr === contentStr) {
                    return true
                }
                return false
            }

            const checkLastSymbol = () => {
                if (element[0].textContent.trim().length === 1 || element[0].textContent.trim().length === 0) {
                    return true
                }

                return false
            }

            const isDownCtrl = (e) => {
                const isMacMeta = window.navigator.platform === 'MacIntel' && e.metaKey
                const isOtherControl = window.navigator.platform !== 'MacIntel' && e.ctrlKey
                return isMacMeta || isOtherControl
            }

            const setCaretPosition = () => {
                const spans = element[0].querySelectorAll('span')
                const span = spans[spans.length - 1]
                const selection = window.getSelection()
                selection.removeAllRanges()
                const range = document.createRange()
                range.selectNodeContents(span)
                range.collapse()
                selection.addRange(range)
            }

            const findNodeAncestor = (node) => {
                let ret = node
                while (ret.nodeType !== Node.ELEMENT_NODE) {
                    ret = ret.parentNode
                }

                return ret
            }

            const spanHTML = ({ uuid, index, confidence, color, text }) => {
                return `<span class="segment-text__word-wrapper" title="Confidence: ${ confidence ? confidence : ''}" word-uuid="${uuid}" id="word_${scope.fileIndex}_${index}" style="color: ${ color ? color : 'rgb(0, 0, 0)' };">${text}</span>`
            }

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

            element.bind('keydown', function(e) {
                if (e.which === 8 || e.which === 46 || e.which === 32) {
                    if (isAllSelected() || checkLastSymbol()) {
                        const html = spanHTML({ uuid: uuidv4(), index: 0, text: '&#8203;'})
                        document.execCommand('insertHTML', false, html)
                        e.preventDefault()
                        return
                    } else {
                        const selection = document.getSelection()
                        const ancestorNode = findNodeAncestor(selection.focusNode)
                        if (isFirefox) {
                            console.log('firefox', ancestorNode, selection.focusNode)
                            if (ancestorNode && ancestorNode.classList.contains('segment-text__space')) {
                                const previousWord = ancestorNode.previousSibling
                                const nextWord = ancestorNode.nextSibling
                                const previousWordText = previousWord.textContent
                                previousWord.textContent = `${previousWordText}${nextWord.textContent}`
                                ancestorNode.remove()
                                nextWord.remove()
    
                                const selection = document.getSelection()
                                const range = document.createRange()
                                selection.removeAllRanges()
                                range.setStart(previousWord.firstChild, previousWordText.length)
                                range.setStart(previousWord.firstChild, previousWordText.length)
                                selection.addRange(range)
    
                                e.preventDefault()
                            }
                        } else {
                            if (ancestorNode && ancestorNode.classList.contains('segment-text__space')) {
                                const previousWord = ancestorNode.previousSibling
                                const nextWord = ancestorNode.nextSibling
                                const previousWordText = previousWord.textContent
                                previousWord.textContent = `${previousWordText}${nextWord.textContent}`
                                ancestorNode.remove()
                                nextWord.remove()
    
                                const selection = document.getSelection()
                                const range = document.createRange()
                                selection.removeAllRanges()
                                range.setStart(previousWord.firstChild, previousWordText.length)
                                range.setStart(previousWord.firstChild, previousWordText.length)
                                selection.addRange(range)
    
                                e.preventDefault()
                            }
                        }
                    }
                }

                if (/^[a-z0-9]$/i.test(e.key) && !isDownCtrl(e)) {
                    if (isAllSelected()) {
                        const html = spanHTML({ uuid: uuidv4(), index: 0, text: e.key})
                        document.execCommand('insertHTML', false, html)
                        e.preventDefault()
                        return
                    } else {
                        const selection = document.getSelection()
                        const ancestorNode = findNodeAncestor(selection.focusNode)
                        if (ancestorNode && ancestorNode.classList.contains('segment-text__space')) {
                            const nodeTo = ancestorNode.nextSibling
                            const nodeToText = nodeTo.textContent
                            nodeTo.textContent = `${e.key}${nodeToText}`
                            const range = document.createRange()
                            selection.removeAllRanges()
                            range.setStart(nodeTo.firstChild, 1)
                            range.setStart(nodeTo.firstChild, 1)
                            selection.addRange(range)

                            e.preventDefault()
                        }
                    }
                }
            })

            element.bind('input', (e) => {
                if (e.originalEvent) {
                    if (e.originalEvent.inputType === 'historyUndo') {
                        document.execCommand('redo')
                    }
                }
            })

            element.bind('keydown keypress', function (e) {
                if (e.which === 13 || e.which === 27) {
                    this.blur();
                    e.preventDefault();
                }
            }) */
        } 
    }
}