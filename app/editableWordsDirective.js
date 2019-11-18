import { uuid } from './utils'

export function editableWordsDirective ($timeout) {
    return {
        restrict: 'E',
        scope: {
            words: '=',
            fileIndex: '=',
            region: '=',
            wordClick: '&',
            wordChanged: '&'
        },
        link: function (scope, element, attrs) {
            element[0].setAttribute('contenteditable', true)

            const updateAll = () => {
                const spans = element[0].querySelectorAll('span.segment-text__word-wrapper')
                const toDel = []
                const toAdd = []
                const wordUuids = scope.words.map(w => w.uuid)
                const spanUuids = []

                if (!spans.length) {
                    $timeout(() => {
                        scope.words = [{start: scope.region.start, end: scope.region.end, text: ''}]
                    })
                    return
                }

                spans.forEach(span => {
                    const wordText = span.textContent.trim()
                    const wordIndex = parseInt(span.getAttribute('data-index'))
                    const wordUuid = span.getAttribute('word-uuid')
                    spanUuids.push(wordUuid)
                    if (wordText.length) {
                        const newWordSplited = wordText.split(' ')
                        if (newWordSplited.length === 1) {
                            if (span.textContent.trim() !== scope.words[wordIndex].text) {
                                let wasEdited = false
                                if (scope.words[wordIndex].text.length) {
                                    wasEdited = true
                                }
                                scope.words[wordIndex].text = span.textContent.trim().replace('&#8203;', '')
                                if (wasEdited) {
                                    scope.wordChanged && scope.wordChanged({ regionIndex: scope.fileIndex, wordIndex })
                                    span.style.color = 'rgb(129, 42, 193)'
                                }
                            }
                        } else {
                            scope.words[wordIndex].text = newWordSplited[0].trim()
                            span.textContent = newWordSplited[0].trim().replace('&#8203;', '')
                            for (let i = 1; i < newWordSplited.length; i++) {
                                newWordSplited[i].trim().length && toAdd.push({
                                    id: wordUuid,
                                    text: newWordSplited[i]
                                })
                            }
                        }
                    } else {
                        toDel.push(wordUuid)
                    }
                })

                wordUuids.forEach((wu) => {
                    if (!spanUuids.includes(wu)) {
                        toDel.push(wu)
                    }
                })

                toDel.forEach((id) => {
                    const delIdx = scope.words.findIndex(w => w.uuid === id)
                    scope.words.splice(delIdx, 1)
                })

                let wasAdded = false

                toAdd.reverse().forEach(({ id, text }) => {
                    const addIdx = scope.words.findIndex(w => w.uuid === id)
                    const wordCopy = Object.assign({}, scope.words[addIdx])
                    wordCopy.text = text.replace('&#8203;', '')
                    wordCopy.uuid = uuid()
                    scope.words.splice(addIdx + 1, 0, wordCopy)
                    wasAdded = true
                })

                if (wasAdded) {
                    formDOM(scope.words)
                }

                if (!scope.words.length) {
                    scope.words = [{start: scope.region.start, end: scope.region.end, text: '', uuid: uuid()}]
                }
            }

            element.bind('blur', () => {
                scope.$apply(updateAll)
            })

            element.bind('click', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    const clickedSpan = window.getSelection().anchorNode.parentNode
                    if (clickedSpan) {
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

            const setWordsAndCaret = (words) => {
                /* wait 2 digest cycle to new DOM */
                $timeout(() => {
                    scope.words = words
                    $timeout(() => {
                        setCaretPosition()
                    })
                })
            }

            const cleanDOM = () => {
                while (element[0].firstChild) {
                    element[0].removeChild(element[0].firstChild);
                }
            }

            const createSpan = (w, index) => {
                const span = document.createElement('span')
                if (w.text.length) {
                    span.textContent = w.text
                } else {
                    span.innerHTML = '&#8203;'
                }
                
                span.classList.add('segment-text__word-wrapper')
                span.style.color = 'rgb(0,0,0)'
                if (w.wasEdited) {
                    span.style.color = 'rgb(129, 42, 193)'
                }

                if (w.confidence) {
                    span.style.opacity = w.confidence
                    if (w.confidence < 0.95 && w.confidence >= 0) {
                        span.classList.add('low-confidence')
                    }
                }

                span.setAttribute('title', `Confidence: ${w.confidence ? w.confidence : ''}`)
                span.setAttribute('data-index', index)
                span.setAttribute('word-uuid', w.uuid)
                span.setAttribute('id', `word_${scope.fileIndex}_${index}`)

                return span
            }

            const createSpace = () => {
                const span = document.createElement('span')
                span.textContent = ' '
                span.classList.add('segment-text__space')
                return span
            }

            const formDOM = (words) => {
                cleanDOM()
                words.forEach((w, index) => {
                    const span = createSpan(w, index)
                    element[0].appendChild(span)

                    if (index < words.length - 1) {
                        const spaceSpan = createSpace()
                        element[0].appendChild(spaceSpan)
                    }
                })
            }

            element.bind('paste', (e) => {
                if (e && e.originalEvent) {
                    const clipboardData = e.originalEvent.clipboardData
                    if (clipboardData) {
                        const text = clipboardData.getData('text/plain')
                        if (isAllSelected()) {
                            const pastedWords = text.split(' ')
                            const words = pastedWords.map((w) => {
                                return {
                                    start: scope.region.start,
                                    end: scope.region.end, 
                                    text: w, 
                                    uuid: uuid()
                                }
                            })
                            setWordsAndCaret(words)
                        } else {
                            document.execCommand('insertText', false, text)
                        }
                    }
                }
                e.preventDefault()
            })

            element.bind('keydown', function(e) {
                if (e.which === 8 || e.which === 46) {
                    if (isAllSelected() || checkLastSymbol()) {
                        scope.words = [{start: scope.region.start, end: scope.region.end, text: '', uuid: uuid()}]
                        e.preventDefault()
                        return
                    }
                }

                if (/^[a-z0-9]$/i.test(e.key) && !isDownCtrl(e)) {
                    if (isAllSelected()) {
                        setWordsAndCaret([{start: scope.region.start, end: scope.region.end, text: e.key, uuid: uuid()}])
                        e.preventDefault()
                        return
                    }
                }
            })

            element.bind('keydown keypress', function (e) {
                if (e.which === 13 || e.which === 27) {
                    this.blur();
                    e.preventDefault();
                }
            })

            scope.$watch('words', (newVal) => {
                if (newVal) {
                    formDOM(newVal)
                } else {
                    cleanDOM()
                }
            })
        }
    }
}