import uuidv4 from 'uuid/v4'

const isFirefox = navigator.userAgent.indexOf('Firefox') !== -1

class GeckoEdtior {
    constructor (element) {
        this.element = element
        this.originalWords = []
        this.previousState = []
        this.listeners = new Map()
        this.spaceSpanHTML = '<span class="segment-text__space"> </span>'
        this.init()
    }

    init () {
        this.element.setAttribute('contenteditable', true)
        this.bindEvents()
    }

    spanHTML ({ uuid, index, confidence, color, text }) {
        return `<span class="segment-text__word-wrapper" title="Confidence: ${ confidence ? confidence : ''}" word-uuid="${uuid}" id="word_${scope.fileIndex}_${index}" style="color: ${ color ? color : 'rgb(0, 0, 0)' };">${text}</span>`
    }

    isDownCtrl (e) {
        const isMacMeta = window.navigator.platform === 'MacIntel' && e.metaKey
        const isOtherControl = window.navigator.platform !== 'MacIntel' && e.ctrlKey
        return isMacMeta || isOtherControl
    }

    bindEvents () {
        this.element.addEventListener('blur', () => {
            this.updateAll()
        })

        this.element.addEventListener('click', (e) => {
            const clickedSpan = window.getSelection().anchorNode.parentNode
            if (e.ctrlKey || e.metaKey) {
                if (clickedSpan && clickedSpan.classList.contains('segment-text__word-wrapper')) {
                    const wordUuid = clickedSpan.getAttribute('word-uuid')
                    const clickedWord = this.words.find(w => w.uuid === wordUuid)
                    this.trigger('wordClick', { word: clickedWord, event: e })
                }
            }
        })

        this.element.addEventListener('keydown', (e) => {
            if (e.which === 13 || e.which === 27) {
                this.element.blur()
                e.preventDefault()
            }

            if (e.which === 8 || e.which === 46 || e.which === 32) {
                if (this.isAllSelected() || this.checkLastSymbol()) {
                    const html = spanHTML({ uuid: uuidv4(), index: 0, text: '&#8203;'})
                    document.execCommand('insertHTML', false, html)
                    e.preventDefault()
                    return
                } else {
                    const selection = document.getSelection()
                    const ancestorNode = this.findNodeAncestor(selection.focusNode)
                    /* deleting a space */
                    if (ancestorNode && ancestorNode.classList.contains('segment-text__space')) {
                        const previousWord = ancestorNode.previousSibling
                        const nextWord = ancestorNode.nextSibling
                        const previousWordText = previousWord.textContent
                        previousWord.textContent = `${previousWordText}${nextWord.textContent}`
                        previousWord.setAttribute('data-end', nextWord.getAttribute('data-end'))
                        ancestorNode.remove()
                        nextWord.remove()

                        const selection = document.getSelection()
                        const range = document.createRange()
                        selection.removeAllRanges()
                        range.setStart(previousWord.firstChild, previousWordText.length)
                        range.setStart(previousWord.firstChild, previousWordText.length)
                        selection.addRange(range)

                        e.preventDefault()
                        return
                    }

                    /* selection between two text nodes */
                    let endNode = this.findNodeAncestor(selection.focusNode)
                    let startNode = this.findNodeAncestor(selection.anchorNode)
                    if (startNode !== endNode) {
                        /* checking if selection is backwards */
                        let selectionBackwards = false
                        const startIndex = Array.from(startNode.parentNode.children).indexOf(startNode)
                        const endIndex = Array.from(endNode.parentNode.children).indexOf(endNode)
                        if (endIndex < startIndex) {
                            selectionBackwards = true
                        }

                        const newNode = selectionBackwards ? endNode : startNode
                        const delNode = selectionBackwards ? startNode : endNode
                        const range = selection.getRangeAt(0)
                        const rangeOffset = range.startOffset

                        const newText =`${newNode.textContent.substring(0, range.startOffset)}${delNode.textContent.substring(range.endOffset, delNode.textContent.length)}`
                        newNode.textContent = newText
                        newNode.setAttribute('data-end', delNode.getAttribute('data-end'))
                        delNode.remove()

                        const newRange = document.createRange()

                        newRange.setStart(newNode.firstChild, rangeOffset)
                        newRange.setStart(newNode.firstChild, rangeOffset)
                        
                        selection.removeAllRanges()
                        selection.addRange(newRange)

                        e.preventDefault()
                    }
                }
            }

            if (/^[a-z0-9]$/i.test(e.key) && !this.isDownCtrl(e)) {
                if (this.isAllSelected()) {
                    const html = spanHTML({ uuid: uuidv4(), index: 0, text: e.key})
                    document.execCommand('insertHTML', false, html)
                    e.preventDefault()
                    return
                } else {
                    const selection = document.getSelection()
                    const ancestorNode = this.findNodeAncestor(selection.focusNode)
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

        this.element.addEventListener('input', (e) => {
            if (e.inputType === 'historyUndo') {
                document.execCommand('redo')
            }
        })
    }

    on (label, callback) {
        this.listeners.has(label) || this.listeners.set(label, [])
        this.listeners.get(label).push(callback)
    }

    trigger (label, ...args) {
        let res = false
        const _trigger = (inListener, label, ...args) => {
            let listeners = inListener.get(label)
            if (listeners && listeners.length) {
                listeners.forEach((listener) => {
                    listener(...args)
                });
                res = true
            }
        };
        _trigger(this.listeners, label, ...args)
        return res
    }

    isAllSelected () {
        const selection = window.getSelection()
        const selectionStr = selection.toString().trim()
        const contentStr = this.element.textContent.replace(/\n\n/g, ' ').replace(/\n/g, '')
        if (selectionStr === contentStr) {
            return true
        }
        return false
    }

    checkLastSymbol () {
        if (this.element.textContent.trim().length === 1 || this.element.textContent.trim().length === 0) {
            return true
        }

        return false
    }

    findNodeAncestor (node) {
        let ret = node
        while (ret.nodeType !== Node.ELEMENT_NODE) {
            ret = ret.parentNode
        }

        return ret
    }

    setRegion (region) {
        this.region = region
        this.setWords(region.data.words)
    }

    setWords (words) {
        this.originalWords = []
        this.cleanDOM()
        if (words) {
            this.originalWords = JSON.parse(JSON.stringify(words))
            this.previousState = JSON.parse(JSON.stringify(words))
            this.words = JSON.parse(JSON.stringify(words))
            this.formDOM(words)
        }
    }

    reset () {
        this.originalWords = []
        this.previousState = []
        this.cleanDOM()
    }

    updateAll () {
        const spans = this.element.querySelectorAll('span.segment-text__word-wrapper')

        if (!spans.length) {
            this.trigger('wordsUpdated', [{start: this.region.start, end: this.region.end, text: '', uuid: uuidv4()}])
            return
        }
        const updatedWords = []
        spans.forEach(span => {
            const wordText = span.textContent.trim()
            const wordUuid = span.getAttribute('word-uuid')
            if (wordText.length) {
                const newWordSplited = wordText.split(' ')
                const originalWord = this.originalWords.find((w) => w.uuid === wordUuid)
                const word = this.words.find((w) => w.uuid === wordUuid)
                if (newWordSplited.length === 1) {
                    if (word) {
                        if (originalWord && span.textContent.trim() !== originalWord.text) {
                            let wasEdited = false
                            if (word.text.length) {
                                wasEdited = true
                            }
                            word.text = span.textContent.trim().replace('&#8203;', '')
                            if (wasEdited) {
                                word.wasEdited = true
                                // this.trigger('wordChanged', wordUuid)
                                span.style.color = 'rgb(129, 42, 193)'
                            } 
                        } else {
                            if (!word.wasEdited) {
                                span.style.color = 'rgb(0, 0, 0)'
                            }
                        }

                        updatedWords.push(Object.assign({}, {
                            ...word,
                            text: span.textContent.trim(),
                            end: parseFloat(span.getAttribute('data-end'))
                        }))
                    } else {
                        updatedWords.push({
                            text: wordText,
                            uuid: uuidv4(),
                            start: this.region.start,
                            end: this.region.end,
                            wasEdited: true
                        })
                    }
                } else {
                    if (word) {
                        if (originalWord && newWordSplited[0].trim() !== originalWord.text.trim()) {
                            updatedWords.push(Object.assign({}, {
                                ...word,
                                text: newWordSplited[0].trim(),
                                wasEdited: true
                            }))
                        } else {
                            updatedWords.push(Object.assign({}, {
                                ...word,
                                text: newWordSplited[0].trim()
                            }))
                        }
                        for (let i = 1; i < newWordSplited.length; i++) {
                            if (newWordSplited[i].trim().length) {
                                const wordCopy = Object.assign({}, {
                                    ...word,
                                    text: newWordSplited[i].replace('&#8203;', ''),
                                    uuid: uuidv4(),
                                    wasEdited: true
                                })
                                updatedWords.push(wordCopy)
                            }
                        }
                    } else {
                        for (let i = 0; i < newWordSplited.length; i++) {
                            if (newWordSplited[i].trim()) {
                                updatedWords.push({
                                    text: newWordSplited[i].replace('&#8203;', ''),
                                    uuid: uuidv4(),
                                    start: this.region.start,
                                    end: this.region.end,
                                    wasEdited: true
                                })
                            }
                        }
                    }
                }
            }
        })

        if (!updatedWords.length) {
            this.words = [{start: this.region.start, end: this.region.end, text: ''}]
        } else {
            this.words = updatedWords
        }

        this.trigger('wordsUpdated', this.words, this.previousState)

        this.previousState = JSON.parse(JSON.stringify(this.words))
        this.formDOM(this.words)
    }

    cleanDOM () {
        while (this.element.firstChild) {
            this.element.removeChild(this.element.firstChild)
        }
    }

    formDOM (words) {
        this.cleanDOM()
        if (words) {
            words.forEach((w, index) => {
                const span = this.createSpan(w, index)
                this.element.appendChild(span)
    
                if (index < words.length - 1) {
                    const spaceSpan = this.createSpace()
                    this.element.appendChild(spaceSpan)
                }
            })
        }
    }

    createSpan (w) {
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

        return span
    }

    createSpace () {
        const span = document.createElement('span')
        span.innerHTML = ' '
        span.classList.add('segment-text__space')
        return span
    }
}

export default GeckoEdtior