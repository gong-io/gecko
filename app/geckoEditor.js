import uuidv4 from 'uuid/v4'
import crel from 'crel'

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

    destroy () {
        this.element.remove()
    }

    spanHTML ({ uuid, confidence, color, text }) {
        return `<span class="segment-text__word-wrapper" title="Confidence: ${ confidence ? confidence : ''}" word-uuid="${uuid}" style="color: ${ color ? color : 'rgb(0, 0, 0)' };">${text}</span>`
    }

    isDownCtrl (e) {
        const isMacMeta = window.navigator.platform === 'MacIntel' && e.metaKey
        const isOtherControl = window.navigator.platform !== 'MacIntel' && e.ctrlKey
        return isMacMeta || isOtherControl
    }

    clickEvent (e) {
        const selection = window.getSelection()
        const clickedSpan = selection.anchorNode.parentNode
        if (e.ctrlKey || e.metaKey) {
            if (clickedSpan && this.isText(clickedSpan)) {
                const wordUuid = clickedSpan.getAttribute('word-uuid')
                const clickedWord = this.words.find(w => w.uuid === wordUuid)
                this.trigger('wordClick', { word: clickedWord, event: e })
            } else if (clickedSpan && this.isSpace(clickedSpan)) {
                const range = selection.getRangeAt(0)
                if (selection.isCollapsed && range.endOffset === clickedSpan.firstChild.textContent.length) {
                    const nextWordSpan = clickedSpan.nextSibling
                    const wordUuid = nextWordSpan.getAttribute('word-uuid')
                    const clickedWord = this.words.find(w => w.uuid === wordUuid)
                    this.trigger('wordClick', { word: clickedWord, event: e })
                }
            }
        }
    }

    cleanEditor () {
        const html = this.spanHTML({ uuid: uuidv4(), index: 0, text: ''})
        document.execCommand('insertHTML', false, html)
    }

    isBackwardsSelection (startNode, endNode) {
        const startIndex = Array.from(startNode.parentNode.children).indexOf(startNode)
        const endIndex = Array.from(endNode.parentNode.children).indexOf(endNode)
        if (endIndex < startIndex) {
            return true
        }

        return false
    }

    isText (node) {
        if (!node) {
            return false
        }
        return node.classList.contains('segment-text__word-wrapper')
    }

    isSpace (node) {
        if (!node) {
            return false
        }
        return node.classList.contains('segment-text__space')
    }

    insertTextBetweenNodes (firstNode, lastNode, text) {
        const selection = document.getSelection()
        const range = selection.getRangeAt(0)
        const { startOffset, endOffset } = range
        const nextSpace = lastNode.nextSibling
        const previousSpace = firstNode.previousSibling
        const previousWord = previousSpace.previousSibling
        const newRange = document.createRange()
        const timeStart = firstNode.getAttribute('data-start')
        const timeEnd = lastNode.getAttribute('data-end')

        document.execCommand('delete')

        const newText = text ? `${firstNode.textContent.substring(0, startOffset)}${text}${lastNode.textContent.substring(range.endOffset, lastNode.textContent.length)}` : `${firstNode.textContent.substring(0, startOffset)}${lastNode.textContent.substring(range.endOffset, lastNode.textContent.length)}`
        
        if (startOffset !== 0) {
            firstNode.textContent = newText
            firstNode.setAttribute('data-end', timeEnd)
            lastNode.remove()

            newRange.setStart(firstNode.firstChild, text ? startOffset + text.length : startOffset)
            newRange.setStart(firstNode.firstChild, text ? startOffset + text.length : startOffset)
        } else if (endOffset !== lastNode.textContent.length) {
            lastNode.textContent = text ? `${text}${lastNode.textContent}` : lastNode.textContent
            newRange.setStart(lastNode.firstChild, text ? startOffset + text.length : startOffset)
            newRange.setStart(lastNode.firstChild, text ? startOffset + text.length : startOffset)
        } else {
            if (text) {
                const span = this.createSpan({ uuid: uuidv4(), start: timeStart, end: timeEnd, text})
                range.insertNode(span)
                newRange.selectNode(span)
                newRange.collapse()
            } else {
                range.deleteContents()
                nextSpace.remove()

                newRange.selectNode(previousWord)
                newRange.collapse()
            }
        }

        selection.removeAllRanges()
        selection.addRange(newRange)
    }

    insertTextBetweenNodeAndSpace(firstNode, lastNode, text) {
        const selection = document.getSelection()
        const range = selection.getRangeAt(0)
        const rangeOffset = range.startOffset
        const previousSpace = firstNode.previousSibling

        const nextWord = lastNode.nextSibling
        const newText = text && text !== ' ' ? `${firstNode.textContent.substring(0, rangeOffset)}${text}${nextWord.textContent}` : `${firstNode.textContent.substring(0, rangeOffset)}${nextWord.textContent}`
        firstNode.textContent = newText
        firstNode.setAttribute('data-end', nextWord.getAttribute('data-end'))
        firstNode.setAttribute('word-uuid', nextWord.getAttribute('word-uuid'))
        lastNode.remove()
        nextWord.remove()

        const newRange = document.createRange()

        if (rangeOffset !== 0) {
            newRange.setStart(firstNode.firstChild, text ? rangeOffset + text.length : rangeOffset)
        } else {
            newRange.setStart(previousSpace.firstChild, previousSpace.firstChild.length)
            newRange.collapse()
        }
        
        selection.removeAllRanges()
        selection.addRange(newRange)
    }

    insertTextBetweenSpaceAndNode(firstNode, lastNode, text) {
        const selection = document.getSelection()
        const range = selection.getRangeAt(0)

        const previousWord = firstNode.previousSibling
        const previousLength = previousWord.textContent.length
        const newText = text ? `${previousWord.textContent}${text}${lastNode.textContent.substring(range.endOffset, lastNode.textContent.length)}` : `${previousWord.textContent}${lastNode.textContent.substring(range.endOffset, lastNode.textContent.length)}`

        document.execCommand('delete')

        previousWord.textContent = newText
        previousWord.setAttribute('data-end', lastNode.getAttribute('data-end'))
        lastNode.remove()
        firstNode.remove()

        const newRange = document.createRange()

        newRange.setStart(previousWord.firstChild, text ? previousLength + text.length : previousLength)
        
        selection.removeAllRanges()
        selection.addRange(newRange)
    }

    insertTextBetweenSpaces (firstNode, lastNode, text) {
        const selection = document.getSelection()
        const range = selection.getRangeAt(0)

        const previousWord = firstNode.previousSibling
        const previousLength = previousWord.textContent.length
        const newRange = document.createRange()

        if (text && text === ' ') {
            document.execCommand('delete')
            const span = this.createSpace()
            range.insertNode(span)
            newRange.selectNode(span)
            newRange.collapse()
        } else {
            const nextWord = lastNode.nextSibling
            const newText = text ? `${previousWord.textContent}${text}${nextWord.textContent}` : `${previousWord.textContent}${nextWord.textContent}`

            previousWord.textContent = newText
            previousWord.setAttribute('data-end', nextWord.getAttribute('data-end'))

            document.execCommand('delete')

            lastNode.remove()
            firstNode.remove()
            nextWord.remove()
            newRange.setStart(previousWord.firstChild, text ? previousLength + text.length : previousLength)
        } 

        
        selection.removeAllRanges()
        selection.addRange(newRange)
    }

    insertTextInsideSpace (space, text) {
        /* replacing a space and merging words */
        const nextWord = space.nextSibling
        const selection = document.getSelection()
        const range = document.createRange()
        const previousWord = space.previousSibling
        if (text && text === ' ') {
            range.setStart(space.firstChild, space.firstChild.length)
            range.collapse()
        } else {
            const previousWordText = previousWord.textContent
            previousWord.textContent = text ? `${previousWordText}${text}${nextWord.textContent}` : `${previousWordText}${nextWord.textContent}`
            previousWord.setAttribute('data-end', nextWord.getAttribute('data-end'))
            space.remove()
            nextWord.remove()
            range.setStart(previousWord.firstChild, text ? previousWordText.length + text.length : previousWordText.length)
        }
        
        selection.removeAllRanges()
        selection.addRange(range)
    }

    keydownEvent (e) {
        if (e.which === 13 || e.which === 27) {
            this.element.blur()
            e.preventDefault()
        }

        if (e.which === 8 || e.which === 46 || e.which === 32) {
            if (this.isAllSelected() || this.checkLastSymbol()) {
                this.cleanEditor()
                e.preventDefault()
                return
            } else {
                const selection = document.getSelection()
                const ancestorNode = this.findNodeAncestor(selection.focusNode)
                if (e.which === 8 && this.isSpace(ancestorNode) && selection.isCollapsed) {
                    /* deleting a space, cursor is in word start position */
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
                } else if (e.which === 46 && this.isText(ancestorNode) && selection.isCollapsed) {
                    /* deleting a space, cursor is in word end position */
                    if (selection.focusOffset === ancestorNode.textContent.length) {
                        const previousWord = ancestorNode
                        const nextSpace = ancestorNode.nextSibling
                        const nextWord = nextSpace.nextSibling
                        const previousWordText = previousWord.textContent
                        previousWord.textContent = `${previousWordText}${nextWord.textContent}`
                        previousWord.setAttribute('data-end', nextWord.getAttribute('data-end'))
                        nextWord.remove()
                        nextSpace.remove()

                        const selection = document.getSelection()
                        const range = document.createRange()
                        selection.removeAllRanges()
                        range.setStart(previousWord.firstChild, previousWordText.length)
                        range.setStart(previousWord.firstChild, previousWordText.length)
                        selection.addRange(range)

                        e.preventDefault()
                        return
                    }
                }

                /* selection between two text nodes */
                let endNode = this.findNodeAncestor(selection.focusNode)
                let startNode = this.findNodeAncestor(selection.anchorNode)
                if (startNode !== endNode) {
                    const selectionBackwards = this.isBackwardsSelection(startNode, endNode)
                    const firstNode = selectionBackwards ? endNode : startNode
                    const lastNode = selectionBackwards ? startNode : endNode
                    if (this.isText(firstNode) && this.isText(lastNode)) {
                        this.insertTextBetweenNodes(firstNode, lastNode, e.which === 32 ? ' ' : null)
                    } else if (this.isText(firstNode) && this.isSpace(lastNode)) {
                        this.insertTextBetweenNodeAndSpace(firstNode, lastNode, e.which === 32 ? ' ' : null)
                    } else if (this.isSpace(firstNode) && this.isText(lastNode)) {
                        this.insertTextBetweenSpaceAndNode(firstNode, lastNode, e.which === 32 ? ' ' : null)
                    } else if (this.isSpace(firstNode) && this.isSpace(lastNode)) {
                        this.insertTextBetweenSpaces(firstNode, lastNode, e.which === 32 ? ' ' : null)
                    }
                    e.preventDefault()
                } else if (this.isSpace(startNode)) {
                    this.insertTextInsideSpace(startNode, e.which === 32 ? ' ' : null)
                    e.preventDefault()
                }
            }
        }

        if (/^[a-z0-9]$/i.test(e.key) && !this.isDownCtrl(e)) {
            if (this.isAllSelected()) {
                const html = this.spanHTML({ uuid: uuidv4(), index: 0, text: e.key})
                document.execCommand('insertHTML', false, html)
                e.preventDefault()
                return
            } else {
                const selection = document.getSelection()
                const ancestorNode = this.findNodeAncestor(selection.focusNode)
                if (selection.isCollapsed) {
                    if (this.isSpace(ancestorNode)) {
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
                } else {
                    /* selection between two text nodes */
                    let endNode = this.findNodeAncestor(selection.focusNode)
                    let startNode = this.findNodeAncestor(selection.anchorNode)
                    if (startNode !== endNode) {
                        const selectionBackwards = this.isBackwardsSelection(startNode, endNode)
                        const firstNode = selectionBackwards ? endNode : startNode
                        const lastNode = selectionBackwards ? startNode : endNode
                        if (this.isText(firstNode) && this.isText(lastNode)) {
                            this.insertTextBetweenNodes(firstNode, lastNode, e.key)
                        } else if (this.isText(firstNode) && this.isSpace(lastNode)) {
                            this.insertTextBetweenNodeAndSpace(firstNode, lastNode, e.key)
                        }  else if (this.isSpace(firstNode) && this.isText(lastNode)) {
                            this.insertTextBetweenSpaceAndNode(firstNode, lastNode, e.key)
                        }  else if (this.isSpace(firstNode) && this.isSpace(lastNode)) {
                            this.insertTextBetweenSpaces(firstNode, lastNode, e.key)
                        }
                        e.preventDefault()
                    } else if (this.isSpace(startNode)) {
                        this.insertTextInsideSpace(startNode, e.key)
                        e.preventDefault()
                    }
                }
            }
        }
    }

    pasteEvent (e) {
        if (e) {
            const clipboardData = e.clipboardData
            if (clipboardData) {
                const text = clipboardData.getData('text/plain').replace(/\n\n/g, ' ').replace(/\n/g, '')
                if (this.isAllSelected()) {
                    const pastedWords = text.split(' ')
                    const words = pastedWords.map((w) => this.spanHTML({ uuid: uuidv4(), start: this.region.start, end: this.region.end, text: w}))
                    document.execCommand('insertHTML', false, words.join(this.spaceSpanHTML))
                    e.preventDefault()
                } else {
                    const selection = document.getSelection()
                    const ancestorNode = this.findNodeAncestor(selection.focusNode)
                    if (selection.isCollapsed) {
                        if (this.isSpace(ancestorNode)) {
                            const nodeTo = ancestorNode.nextSibling
                            const nodeToText = nodeTo.textContent
                            nodeTo.textContent = `${text}${nodeToText}`
                            const range = document.createRange()
                            selection.removeAllRanges()
                            range.setStart(nodeTo.firstChild, text.length)
                            range.setStart(nodeTo.firstChild, text.length)
                            selection.addRange(range)
                        } else {
                            document.execCommand('insertText', false, text)
                        }
                        e.preventDefault()
                    } else {
                        /* selection between two text nodes */
                        let endNode = this.findNodeAncestor(selection.focusNode)
                        let startNode = this.findNodeAncestor(selection.anchorNode)
                        if (startNode !== endNode) {
                            const selectionBackwards = this.isBackwardsSelection(startNode, endNode)
                            const firstNode = selectionBackwards ? endNode : startNode
                            const lastNode = selectionBackwards ? startNode : endNode
                            if (this.isText(firstNode) && this.isText(lastNode)) {
                                this.insertTextBetweenNodes(firstNode, lastNode, text)
                            } else if (this.isText(firstNode) && this.isSpace(lastNode)) {
                                this.insertTextBetweenNodeAndSpace(firstNode, lastNode, text)
                            }  else if (this.isSpace(firstNode) && this.isText(lastNode)) {
                                this.insertTextBetweenSpaceAndNode(firstNode, lastNode, text)
                            }  else if (this.isSpace(firstNode) && this.isSpace(lastNode)) {
                                this.insertTextBetweenSpaces(firstNode, lastNode, text)
                            }
                        } else if (this.isSpace(startNode)) {
                            this.insertTextInsideSpace(startNode, text)
                        } else if (this.isText(startNode)) {
                            const range = selection.getRangeAt(0)
                            if (range.startOffset === 0 && range.endOffset === startNode.textContent.length) {
                                startNode.textContent = text
                                range.selectNode(startNode)
                                range.collapse()
                                selection.removeAllRanges()
                                selection.addRange(range)
                            } else {
                                document.execCommand('insertText', false, text)
                            }
                        } else {
                            document.execCommand('insertText', false, text)
                        }
                        e.preventDefault()
                    }
                    
                }
            }
        }
    }

    bindEvents () {
        this.element.addEventListener('blur', () => {
            this.updateAll()
        })

        this.element.addEventListener('focus', (e) => {
            this.trigger('focus', e)
        })

        this.element.addEventListener('click', (e) => {
            this.clickEvent(e)
        })

        this.element.addEventListener('keydown', (e) => {
            this.keydownEvent(e)
        })

        this.element.addEventListener('input', (e) => {
            if (e.inputType === 'historyUndo') {
                document.execCommand('redo')
            }
        })

        this.element.addEventListener('paste', (e) => {
            this.pasteEvent(e)
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
        if (region && region.data.words) {
            this.region = region
            this.setWords(region.data.words)
        }
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
        this.words = []
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
            const wordSelected = span.classList.contains('selected-word')
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
                            word.text = span.textContent.trim()
                            if (wasEdited) {
                                word.wasEdited = true
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
                            end: parseFloat(span.getAttribute('data-end')),
                            isSelected: wordSelected
                        }))
                    } else {
                        updatedWords.push({
                            text: wordText,
                            uuid: uuidv4(),
                            start: this.region.start,
                            end: this.region.end,
                            wasEdited: true,
                            isSelected: wordSelected
                        })
                    }
                } else {
                    if (word) {
                        if (originalWord && newWordSplited[0].trim() !== originalWord.text.trim()) {
                            updatedWords.push(Object.assign({}, {
                                ...word,
                                text: newWordSplited[0].trim(),
                                wasEdited: true,
                                isSelected: wordSelected
                            }))
                        } else {
                            updatedWords.push(Object.assign({}, {
                                ...word,
                                text: newWordSplited[0].trim(),
                                isSelected: wordSelected
                            }))
                        }
                        for (let i = 1; i < newWordSplited.length; i++) {
                            if (newWordSplited[i].trim().length) {
                                const wordCopy = Object.assign({}, {
                                    ...word,
                                    text: newWordSplited[i],
                                    uuid: uuidv4(),
                                    wasEdited: true,
                                    isSelected: wordSelected
                                })
                                updatedWords.push(wordCopy)
                            }
                        }
                    } else {
                        for (let i = 0; i < newWordSplited.length; i++) {
                            if (newWordSplited[i].trim()) {
                                updatedWords.push({
                                    text: newWordSplited[i],
                                    uuid: uuidv4(),
                                    start: this.region.start,
                                    end: this.region.end,
                                    wasEdited: true,
                                    isSelected: wordSelected
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

        this.trigger('wordsUpdated', this.words.map((w) => {
            const copy = Object.assign({}, w)
            delete copy.isSelected
            return copy
        }), this.previousState.map((w) => {
            const copy = Object.assign({}, w)
            delete copy.isSelected
            return copy
        }))

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
        const frag = document.createDocumentFragment()
        if (words) {
            words.forEach((w, index) => {
                frag.appendChild(this.createSpan(w, index))
                if (index < words.length - 1) {
                    frag.appendChild(this.createSpace())
                }
            })
        }
        this.element.appendChild(frag)
    }

    createSpan (w) {
        const classes = ['segment-text__word-wrapper']

        if (w.wasEdited) {
            classes.push('segment-text__word-wrapper--was-edited')
        } 

        if (w.confidence) {
            if (w.confidence < 0.95 && w.confidence >= 0) {
                classes.push('low-confidence')
            }
        }

        if (w.isSelected) {
            classes.push('selected-word')
            delete w.isSelected
        }

        const el = crel(
            'span',
            {
                'class' : classes.join(' '),
                'title' : `Confidence: ${w.confidence ? w.confidence : ''}`,
                'data-start': w.start,
                'data-end': w.end,
                'word-uuid': w.uuid
            },
            w.text.length ? document.createTextNode(w.text) : document.createTextNode('')
        )

        if (w.confidence) {
            el.style.opacity = w.confidence
        }

        return el
    }

    createSpace () {
        return crel('span', { 'class' : 'segment-text__space' }, document.createTextNode(' '))
    }
}

export default GeckoEdtior