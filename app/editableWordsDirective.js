import uuidv4 from 'uuid/v4'

export function editableWordsDirective ($timeout) {
    return {
        restrict: 'E',
        scope: {
            words: '=',
            fileIndex: '=',
            region: '=',
            wordClick: '&',
            wordChanged: '&',
            control: '='
        },
        link: function (scope, element, attrs) {
            element[0].setAttribute('contenteditable', true)

            const spaceSpanHTML = '<span class="segment-text__space"> </span>'

            scope.appControl = scope.control || {}
            scope.originalWords = []
            scope.appControl.resetEditableWords = () => {
                scope.originalWords = []
                cleanDOM()
                $timeout(() => {
                    if (scope.words) {
                        scope.originalWords = JSON.parse(JSON.stringify(scope.words))
                        formDOM(scope.words)
                    }
                })
            }
            scope.appControl.cleanEditableDOM = () => {
                scope.originalWords = []
                cleanDOM()
            }

            scope.blockWatcher = false

            const updateAll = () => {
                const spans = element[0].querySelectorAll('span.segment-text__word-wrapper')

                if (!spans.length) {
                    $timeout(() => {
                        scope.words = [{start: scope.region.start, end: scope.region.end, text: ''}]
                    })
                    return
                }
                const updatedWords = []
                spans.forEach(span => {
                    const wordText = span.textContent.trim()
                    const wordUuid = span.getAttribute('word-uuid')
                    if (wordText.length) {
                        const newWordSplited = wordText.split(' ')
                        const originalWord = scope.originalWords.find((w) => w.uuid === wordUuid)
                        const word = scope.words.find((w) => w.uuid === wordUuid)
                        if (newWordSplited.length === 1) {
                            if (word) {
                                if (span.textContent.trim() !== originalWord.text) {
                                    let wasEdited = false
                                    if (word.text.length) {
                                        wasEdited = true
                                    }
                                    word.text = span.textContent.trim().replace('&#8203;', '')
                                    if (wasEdited) {
                                        scope.wordChanged && scope.wordChanged({ regionIndex: scope.fileIndex, wordUuid })
                                        span.style.color = 'rgb(129, 42, 193)'
                                    } 
                                } else {
                                    span.style.color = 'rgb(0, 0, 0)'
                                }
                                updatedWords.push(Object.assign({}, word))
                            } else {
                                updatedWords.push({
                                    text: wordText,
                                    uuid: uuidv4(),
                                    start: scope.region.start,
                                    end: scope.region.end
                                })
                            }
                        } else {
                            if (word) {
                                word.text = newWordSplited[0].trim()
                                updatedWords.push(Object.assign({}, word))
                                for (let i = 1; i < newWordSplited.length; i++) {
                                    const wordCopy = Object.assign({}, word)
                                    wordCopy.text = newWordSplited[i].replace('&#8203;', '')
                                    wordCopy.uuid = uuidv4()
                                    updatedWords.push(wordCopy)
                                }
                            } else {
                                for (let i = 0; i < newWordSplited.length; i++) {
                                    updatedWords.push({
                                        text: newWordSplited[i].replace('&#8203;', ''),
                                        uuid: uuidv4(),
                                        start: scope.region.start,
                                        end: scope.region.end
                                    })
                                }
                            }
                        }
                    }
                })

                if (!updatedWords.length) {
                    scope.words = [{start: scope.region.start, end: scope.region.end, text: '', uuid: uuidv4()}]
                } else {
                    scope.words = updatedWords
                }
            }

            element.bind('blur', () => {
                scope.$apply(updateAll)
            })

            element.bind('click', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    const clickedSpan = window.getSelection().anchorNode.parentNode
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

            const spanHTML = ({ uuid, index, confidence, color, text }) => {
                return `<span class="segment-text__word-wrapper" title="Confidence: ${ confidence ? confidence : ''}" word-uuid="${uuid}" id="word_${scope.fileIndex}_${index}" style="color: ${ color ? color : 'rgb(0, 0, 0)' };">${text}</span>`
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
                span.setAttribute('data-start', w.start)
                span.setAttribute('data-end', w.end)
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
                words && words.forEach((w, index) => {
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
                    }
                }

                if (/^[a-z0-9]$/i.test(e.key) && !isDownCtrl(e)) {
                    if (isAllSelected()) {
                        const html = spanHTML({ uuid: uuidv4(), index: 0, text: e.key})
                        document.execCommand('insertHTML', false, html)
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
        }
    }
}