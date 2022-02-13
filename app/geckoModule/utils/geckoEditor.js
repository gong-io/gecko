import { v4 as uuidv4 } from 'uuid';
import crel from 'crel'

import { findByUuid, compareObjects } from './index'

const spaceSpanHTML = '<span class="segment-text__space"> </span>'

class GeckoEdtior {
    constructor (element) {
        this.element = element
        this.previousElementStack = [];
        this.nextElementStack = [];
        this.originalWords = []
        this.previousState = []
        this.listeners = new Map()
        this.wordsEls = new Map()
        this.selectedWord = null
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



    clickEvent (e, moveByEnter = false) {
        const selection = window.getSelection()
        const clickedSpan = selection.anchorNode.parentNode
        if (e.ctrlKey || e.metaKey || moveByEnter) {
            if (clickedSpan && this.isText(clickedSpan)) {
                const wordUuid = clickedSpan.getAttribute('word-uuid')
                const clickedWord = findByUuid(this.words, wordUuid)
                this.trigger('wordClick', { word: clickedWord, event: e })
            } else if (clickedSpan && this.isSpace(clickedSpan)) {
                const range = selection.getRangeAt(0)
                if (selection.isCollapsed && range.endOffset === clickedSpan.firstChild.textContent.length) {
                    const nextWordSpan = clickedSpan.nextSibling
                    const wordUuid = nextWordSpan.getAttribute('word-uuid')
                    const clickedWord = findByUuid(this.words, wordUuid)
                    this.trigger('wordClick', { word: clickedWord, event: e })
                }
            } else {
                if (this.element.textContent.trim().length === 0) {
                    this.trigger('emptyEditorClick', { region: this.region, event: e })
                }
            }
        }
    }

    cleanEditor (allSelected = false) {
        if (!allSelected) {
            if (this.element.firstChild) {
                this.element.firstChild.textContent = ''
                const selection = window.getSelection()
                const range = document.createRange()
                range.selectNode(this.element.firstChild)
                range.collapse()

                selection.removeAllRanges()
                selection.addRange(range)
            }
        } else {
            const html = this.spanHTML({ uuid: uuidv4(), index: 0, text: ''})
            document.execCommand('insertHTML', false, html)
        }

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
        const previousSpace = firstNode.previousSibling
        const newRange = document.createRange()
        const timeStart = firstNode.getAttribute('data-start')
        const timeEnd = lastNode.getAttribute('data-end')

        const newText = text ? `${firstNode.textContent.substring(0, startOffset)}${text}${lastNode.textContent.substring(range.endOffset, lastNode.textContent.length)}` : `${firstNode.textContent.substring(0, startOffset)}${lastNode.textContent.substring(range.endOffset, lastNode.textContent.length)}`

        if (startOffset !== 0) {
            document.execCommand('delete')

            firstNode.textContent = newText
            firstNode.setAttribute('data-end', timeEnd)
            lastNode.remove()

            newRange.setStart(firstNode.firstChild, text ? startOffset + text.length : startOffset)
            newRange.setStart(firstNode.firstChild, text ? startOffset + text.length : startOffset)
        } else if (endOffset !== lastNode.textContent.length) {
            document.execCommand('delete')

            lastNode.textContent = text ? `${text}${lastNode.textContent}` : lastNode.textContent
            newRange.setStart(lastNode.firstChild, text ? startOffset + text.length : startOffset)
            newRange.setStart(lastNode.firstChild, text ? startOffset + text.length : startOffset)
        } else {
            if (text) {
                const span = this.createSpan({ uuid: uuidv4(), start: timeStart, end: timeEnd, text})
                document.execCommand('insertHTML', false, span.outerHTML)
                return
            } else {
                if (previousSpace)
                    newRange.selectNodeContents(previousSpace);
                newRange.collapse();
                range.deleteContents();
            }
        }

        selection.removeAllRanges()
        selection.addRange(newRange)
    }

    insertTextBetweenNodeAndSpace(firstNode, lastNode, text) {
        const selection = document.getSelection()
        const range = selection.getRangeAt(0)
        const rangeOffset = range.startOffset

        const newRange = document.createRange()
        const nextWord = lastNode.nextSibling

        if (rangeOffset && text && !text.trim().length) {
            firstNode.textContent = `${firstNode.textContent.substring(0, rangeOffset)}`
            newRange.setStart(lastNode.firstChild, lastNode.textContent.length)
        } else {
            const newText = text ? `${firstNode.textContent.substring(0, rangeOffset)}${text.trim().length ? text : ''}${nextWord.textContent}` : `${firstNode.textContent.substring(0, rangeOffset)}${nextWord.textContent}`
            firstNode.textContent = newText
            firstNode.setAttribute('data-end', nextWord.getAttribute('data-end'))
            firstNode.setAttribute('word-uuid', nextWord.getAttribute('word-uuid'))
            lastNode.remove()
            nextWord.remove()

            if (text && text.trim().length) {
                newRange.setStart(firstNode.firstChild, text ? rangeOffset + text.length : rangeOffset)
            } else if (!text) {
                newRange.setStart(firstNode.firstChild, rangeOffset)
            }else {
                const previousSpace = firstNode.previousSibling
                newRange.setStart(previousSpace.firstChild, previousSpace.textContent.length)
            }
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

    insertTextInsideTextNode (node, text) {
        node.textContent = '\u200B'

        const range = document.createRange()
        range.selectNode(node.firstChild)
        range.collapse()

        const selection = window.getSelection()
        selection.removeAllRanges()
        selection.addRange(range)
    }

    setSelectionToNodeEnd (node) {
        const range = document.createRange()
        const selection = window.getSelection()
        range.selectNodeContents(node)
        range.collapse()
        selection.removeAllRanges()
        selection.addRange(range)
    }

    keydownEvent (e) {
        if (e.which === 13 || e.which === 27) {
            if (e.shiftKey) {
                const selection = document.getSelection()
                if (selection.isCollapsed) {
                    const range = selection.getRangeAt(0)
                    let { startOffset } = range
                    let wordNode = this.findNodeAncestor(selection.focusNode)
                    if(wordNode.innerText.length === startOffset){
                        wordNode = wordNode.nextSibling
                        startOffset = 0
                    }
                    if (this.isSpace(wordNode)) {
                        wordNode = wordNode.nextSibling
                        startOffset = 0
                    }
                    const wordUuid = wordNode.getAttribute('word-uuid')
                    const word = findByUuid(this.words, wordUuid)
                    const isLast = wordNode === this.element.lastChild && word.text.length === startOffset
                    const isFirst = wordNode === this.element.firstChild && startOffset === 0
                    if (wordUuid && !isLast && !isFirst) {
                        e.preventDefault()
                        this.trigger('split', {
                            word,
                            offset: startOffset
                        })
                        return
                    }
                }
            }
            this.element.blur()
            e.preventDefault()
            return
        }

        const isMacMeta = window.navigator.platform === 'MacIntel' && e.metaKey
        const isOtherControl = window.navigator.platform !== 'MacIntel' && e.ctrlKey
        const isDownCtrl = isMacMeta || isOtherControl
        const isPrintableKey = e.key.length === 1

        if (isDownCtrl && !e.shiftKey && !e.altKey && (e.which === 37 || e.which === 39)) {
            const selection = document.getSelection()
            const ancestorNode = this.findNodeAncestor(selection.focusNode)
            const range = document.createRange()
            let nodeTo
            if (e.which === 37) {
                if (this.isText(ancestorNode)) {
                    if (ancestorNode.previousSibling && ancestorNode.previousSibling.previousSibling) {
                        nodeTo = ancestorNode.previousSibling.previousSibling.firstChild
                    }
                } else {
                    if (ancestorNode.previousSibling) {
                        nodeTo = ancestorNode.previousSibling.firstChild
                    }
                }
            } else if (e.which === 39) {
                if (this.isText(ancestorNode)) {
                    if (ancestorNode.nextSibling && ancestorNode.nextSibling.previousSibling) {
                        nodeTo = ancestorNode.nextSibling.nextSibling.firstChild
                    }
                } else {
                    if (ancestorNode.nextSibling) {
                        nodeTo = ancestorNode.nextSibling.firstChild
                    }
                }
            }

            if (nodeTo) {
                range.selectNode(nodeTo)
                range.collapse()
                selection.removeAllRanges()
                selection.addRange(range)
            }

            e.preventDefault()
            e.stopPropagation()
            return
        }

        if (e.which === 8 || e.which === 46 || e.which === 32) {
            if ((e.which === 8 || e.which === 46) && (this.isAllSelected() || this.checkLastSymbol())) {
                this.cleanEditor(this.isAllSelected())
                e.preventDefault()
                return
            } else {
                const selection = document.getSelection()
                const ancestorNode = this.findNodeAncestor(selection.focusNode)
                if (e.which === 8 && this.isSpace(ancestorNode) && selection.isCollapsed) {
                    /* deleting a space, cursor is in word start position, backspace pressed */
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
                } else if (e.which === 46 && this.isSpace(ancestorNode) && selection.isCollapsed) {
                    /* deleting a last char, cursor is in word start position, delete pressed */
                    if (ancestorNode.nextSibling.textContent.replace('\u200B', '').length === 1) {
                        this.insertTextInsideTextNode(ancestorNode.nextSibling, null)
                        e.preventDefault()
                    }
                    return
                } else if (e.which === 46 && this.isText(ancestorNode) && selection.isCollapsed) {
                    /* deleting a space, cursor is in word end position, delete pressed */
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
                } else if (e.which === 8 && this.isText(ancestorNode) && selection.isCollapsed) {
                    /* deleting a last character, cursor is in word end position, delete pressed */
                    if (ancestorNode.textContent.replace('\u200B', '').length === 1) {
                        this.insertTextInsideTextNode(ancestorNode, null)
                        e.preventDefault()
                    } else if (ancestorNode.textContent.replace('\u200B', '').length === 0) {
                        const selection = document.getSelection()
                        const range = document.createRange()

                        const previousSpace = ancestorNode.previousSibling
                        if (previousSpace) {
                            const previousWord = previousSpace.previousSibling
                            const previousWordText = previousWord.textContent

                            ancestorNode.remove()
                            previousSpace.remove()

                            selection.removeAllRanges()

                            range.setStart(previousWord.firstChild, previousWordText.length)
                            range.setStart(previousWord.firstChild, previousWordText.length)
                            selection.addRange(range)
                        }
                        e.preventDefault()
                    }
                    return
                } else if (e.which === 32 && selection.focusNode === this.element && selection.isCollapsed) {
                    /* input first space in empty editable */
                    e.preventDefault()
                    return
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
                } else if (!selection.isCollapsed && selection.toString().replace('\u200B', '').length === startNode.textContent.replace('\u200B', '').length) {
                    this.insertTextInsideTextNode(startNode, e.which === 32 ? ' ' : null)
                    e.preventDefault()
                }
            }
        }

        if (this.isDownCtrl(e) && e.which === 90){
            if (this.previousElementStack.length > 0){
                this.nextElementStack.unshift(this.element.innerHTML);
                this.element.innerHTML = this.previousElementStack.pop();
                e.stopPropagation();
            }
            else if (this.nextElementStack.length > 0){
                this.previousElementStack.push(this.element.innerHTML);
                this.element.innerHTML = this.nextElementStack.pop();
                e.stopPropagation();
            }
        }

        if (isPrintableKey && !this.isDownCtrl(e)) {
            if(this.previousElementStack.length === 0){
                this.nextElementStack = [];
                this.previousElementStack.push(this.element.innerHTML);
            }

            if (this.isAllSelected()) {
                const html = this.spanHTML({ uuid: uuidv4(), index: 0, text: e.key})
                document.execCommand('insertHTML', false, html)
                e.preventDefault()
                return
            } else {
                const selection = document.getSelection()
                const ancestorNode = this.findNodeAncestor(selection.focusNode)
                if (selection.focusNode === this.element && selection.isCollapsed) {
                    /* input first char in empty editable */
                    const firstSpan = this.element.firstChild
                    firstSpan.textContent = `${e.key}`
                    const range = document.createRange()
                    const selection = window.getSelection()
                    range.selectNodeContents(firstSpan)
                    range.collapse()
                    selection.removeAllRanges()
                    selection.addRange(range)
                    e.preventDefault()
                    return
                }
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
                    } else if (ancestorNode.textContent.length === 0) {
                        const nodeTo = ancestorNode
                        nodeTo.textContent = `${e.key}`

                        const range = document.createRange()
                        selection.removeAllRanges()
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
                    document.execCommand('insertHTML', false, words.join(spaceSpanHTML))
                    e.preventDefault()
                } else {
                    const selection = document.getSelection()
                    const ancestorNode = this.findNodeAncestor(selection.focusNode)
                    if (selection.focusNode === this.element && selection.isCollapsed) {
                        /* paste in empty editable */
                        const firstSpan = this.element.firstChild
                        firstSpan.textContent = `${text}`
                        const range = document.createRange()
                        range.selectNodeContents(firstSpan)
                        range.collapse()
                        selection.removeAllRanges()
                        selection.addRange(range)
                        e.preventDefault()
                        return
                    }

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
        this.element.addEventListener('blur', (e) => {
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
        if (selectionStr === contentStr && !selection.isCollapsed) {
            return true
        }
        return false
    }

    checkLastSymbol () {
        if (this.element.textContent.length === 1 || this.element.textContent.length === 0) {
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

    fixTimes(spans){
        for (let i = 0, l = spans.length; i < l; i++) {
            const span = spans[i]
            const wordText = span.textContent.trim().replace('\u200B', '')
            const wordUuid = span.getAttribute('word-uuid')
            if (wordText.length) {


            }
        }
    }

    updateAll () {
        this.previousElementStack = [];
        this.nextElementStack = [];
        const spans = this.element.querySelectorAll('span.segment-text__word-wrapper')

        const selection = document.getSelection();
        let forwardSelection = !(this.isBackwardsSelection(this.findNodeAncestor(selection.anchorNode), this.findNodeAncestor(selection.extentNode)) || (this.findNodeAncestor(selection.anchorNode) == this.findNodeAncestor(selection.extentNode) && selection.anchorOffset > selection.extentOffset))

        let startNode = forwardSelection ? this.findNodeAncestor(selection.anchorNode) : this.findNodeAncestor(selection.extentNode);
        let endNode = forwardSelection ? this.findNodeAncestor(selection.extentNode) : this.findNodeAncestor(selection.anchorNode);
        let startOffset = 0;

        let i = 0;
        while(i < this.element.children.length && this.element.children[i] !== startNode){
            startOffset += this.element.children[i].textContent.length;
            i++;
        }
        let endOffset = startOffset;
        while(i < this.element.children.length && this.element.children[i] !== endNode){
            endOffset += this.element.children[i].textContent.length;
            i++;
        }
        startOffset += forwardSelection ? selection.anchorOffset : selection.extentOffset;
        endOffset += forwardSelection ? selection.extentOffset : selection.anchorOffset;

        const text = this.element.textContent;

        if (!spans.length) {
            this.trigger('wordsUpdated', [{start: this.region.start, end: this.region.end, text: '', uuid: uuidv4()}])
            return
        }

        const updatedWords = []
        for (let i = 0, l = spans.length; i < l; i++) {
            const span = spans[i]
            const wordText = span.textContent.trim().replace('\u200B', '')
            const wordUuid = span.getAttribute('word-uuid')
            const wordSelected = span.classList.contains('selected-word')
            if (wordText.length) {
                const newWordSplited = wordText.split(' ')
                const originalWord = findByUuid(this.originalWords, wordUuid)
                var originalWordIndex;
                for (let j = 0; j <  this.originalWords.length; j++){
                    if (originalWord == this.originalWords[j]){
                        originalWordIndex = j;
                        break;
                    }
                }

                const word = findByUuid(this.words, wordUuid)
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
                            end: word.end,
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
                }
                else {
                    if (word) {
                        let start, end;
                        if (i > 0){
                            if (!originalWord || spans[i - 1].dataset.end !==  originalWord.start){
                                start = Number(spans[i - 1].dataset.end);
                            }
                            else{
                                start = originalWord.start;
                            }
                        }
                        else{
                            start = this.region.start;
                        }

                        if (i < (spans.length - 1)){
                            if (!originalWord || spans[i + 1].dataset.start !==  originalWord.end){
                                end = Number(spans[i + 1].dataset.start);
                            }
                            else{
                                end = originalWord.end;
                            }
                        }
                        else{
                            end = this.region.end;
                        }



                        let duration = (end - start) / newWordSplited.length;
                        updatedWords.push(Object.assign({}, {
                            ...word,
                            start: start,
                            end: Math.round((start + duration) * 100) / 100,
                            text: newWordSplited[0].trim(),
                            wasEdited: true,
                            isSelected: wordSelected
                        }))
                        for (let j = 1; j < newWordSplited.length; j++) {
                            if (newWordSplited[j].trim().length) {
                                const wordCopy = Object.assign({}, {
                                    ...word,
                                    start: Math.round((start + duration * j) * 100) / 100,
                                    end: Math.round((start + duration * (j + 1)) * 100) / 100,
                                    text: newWordSplited[j],
                                    uuid: uuidv4(),
                                    wasEdited: true,
                                    isSelected: wordSelected
                                })
                                updatedWords.push(wordCopy)
                            }
                        }
                    } else {
                        let start = i > 0 ? Number(spans[i - 1].dataset.end) : this.region.start;// this.region.start
                        if (start < this.region.start)
                            start = this.region.start;
                        let end = i < spans.length - 1 ? Number(spans[i + 1].dataset.start) : this.region.end;// this.region.end
                        if (end > this.region.end)
                            end = this.region.end;
                        let duration = (end - start) / newWordSplited.length;
                        for (let j = 0; j < newWordSplited.length; j++) {
                            if (newWordSplited[j].trim()) {
                                updatedWords.push({
                                    text: newWordSplited[j],
                                    uuid: uuidv4(),
                                    start: Math.round((start + duration * j) * 100) / 100,
                                    end: Math.round((start + duration * (j + 1)) * 100) / 100,
                                    wasEdited: true,
                                    isSelected: wordSelected
                                })
                            }
                        }
                    }
                }
            }
        }

        if (!updatedWords.length) {
            this.words = [{start: this.region.start, end: this.region.end, text: ''}]
        } else {
            this.words = updatedWords
        }

        let wasChanged = false

        const newWords = this.words.map((w) => {
            const copy = Object.assign({}, w)
            delete copy.isSelected
            return copy
        })

        const oldWords = this.previousState.map((w) => {
            const copy = Object.assign({}, w)
            delete copy.isSelected
            return copy
        })

        if (newWords.length !== oldWords.length) {
            wasChanged = true
        } else {
            newWords.forEach(w => {
                const previous = findByUuid(oldWords, w.uuid)
                if (!previous || !compareObjects(w, previous)) {
                    wasChanged = true
                }
            })
        }

        wasChanged && this.trigger('wordsUpdated', newWords, oldWords)

        this.previousState = newWords.slice()
        this.formDOM(this.words)

        selection.removeAllRanges()

        const newRange = document.createRange();

        let startNodeIndex = text.substring(0, startOffset).trim().split(/\s+/g).length + (text.substring(0, startOffset).match(/\s+/g) || []).length;
        let startIndex = startOffset - 1 - text.substring(0, startOffset).lastIndexOf(" ");
        startNode = this.element.children[startNodeIndex];

        if (startNode && /\s/.test(startNode.innerText)){
            if (/\s/.test(text[startOffset]))
                startIndex = 0;
            else if (startOffset > 0 && /\s/.test(text[startOffset - 1])){
                startNodeIndex--;
                startIndex = 0;
            }
            else
                startNodeIndex--;
            startNode = this.element.children[startNodeIndex];
        }
        if (!startNode){
            startNodeIndex = this.element.children.length - 1;
            startIndex = this.element.children[startNodeIndex].textContent.length;
        }

        let endNodeIndex = text.substring(0, endOffset).trim().split(/\s+/g).length + (text.substring(0, endOffset).match(/\s+/g) || []).length;
        let endIndex = endOffset - 1 - text.substring(0, endOffset).lastIndexOf(" ");
        endNode = this.element.children[endNodeIndex];
        if (!endNode || /\s/.test(endNode.innerText)){
            if (/\s/.test(text[endOffset]))
                endIndex = 0;
            else if (endOffset > 0 && /\s/.test(text[endOffset - 1])){
                endNodeIndex--;
                endIndex = 0;
            }
            else
                endNodeIndex--;
            endNode = this.element.children[endNodeIndex];
        }
        if (!endNode){
            endNodeIndex = this.element.children.length - 1;
            endIndex = this.element.children[endNodeIndex].textContent.length;
        }

        newRange.setStart(this.element.children[startNodeIndex].firstChild, startIndex);
        newRange.setEnd(this.element.children[endNodeIndex].firstChild, endIndex);

        selection.addRange(newRange)
    }

    cleanDOM () {
        while (this.element.firstChild) {
            this.element.removeChild(this.element.firstChild)
        }
        this.wordsEls.clear()
    }

    formDOM (words) {
        this.cleanDOM()
        const frag = document.createDocumentFragment()
        if (words) {
            for (let i = 0, l = words.length; i < l; i++) {
                const wordEl = this.createSpan(words[i], i)
                this.wordsEls.set(words[i].uuid, wordEl)
                frag.appendChild(wordEl)
                if (i < l - 1) {
                    frag.appendChild(this.createSpace())
                }
            }
        }

        this.element.appendChild(frag)
    }

    resetSelected () {
        this.selectedWord && this.selectedWord.classList.remove('selected-word')
        this.element.querySelectorAll('.selected-word').forEach((w) => {
            w.classList.remove('selected-word')
        })
    }

    setSelected (uuid) {
        const wordEl = this.wordsEls.get(uuid)
        wordEl.classList.add('selected-word')
        this.selectedWord = wordEl
    }

    setFound (uuid) {
        const wordEl = this.wordsEls.get(uuid)
        wordEl.classList.add('found-word')
    }
    resetFound () {
        this.element.querySelectorAll('.found-word').forEach((w) => {
            w.classList.remove('found-word')
        })
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
                'title' : `Confidence: ${w.confidence ? w.confidence : ''}, start: ${w.start ? w.start : ''}, end: ${w.end ? w.end : ''}`,
                'data-start': w.start,
                'data-end': w.end,
                'word-uuid': w.uuid,
                'style' : w.color ? `color: ${w.color}` : ''
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