import uuidv4 from 'uuid/v4'

class GeckoEdtior {
    constructor (element) {
        this.element = element
        this.originalWords = []
        this.previousState = []
        this.listeners = new Map()
        this.init()
    }

    init () {
        this.element.setAttribute('contenteditable', true)
        this.bindEvents()
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
                    console.log('trigger')
                    this.trigger('wordClick', { word: clickedWord, event: e })
                }
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
                        if (span.textContent.trim() !== originalWord.text) {
                            let wasEdited = false
                            if (word.text.length) {
                                wasEdited = true
                            }
                            word.text = span.textContent.trim().replace('&#8203;', '')
                            if (wasEdited) {
                                word.wasEdited = true
                                this.trigger('wordChanged', wordUuid)
                                span.style.color = 'rgb(129, 42, 193)'
                            } 
                        } else {
                            if (!word.wasEdited) {
                                span.style.color = 'rgb(0, 0, 0)'
                            }
                        }
                        updatedWords.push(Object.assign({}, word))
                    } else {
                        updatedWords.push({
                            text: wordText,
                            uuid: uuidv4(),
                            start: this.region.start,
                            end: this.region.end
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
                                start: this.region.start,
                                end: this.region.end
                            })
                        }
                    }
                }
            }
        })

        if (!updatedWords.length) {
            this.trigger('wordsUpdated', [{start: this.region.start, end: this.region.end, text: ''}])
        } else {
            this.trigger('wordsUpdated', updatedWords)
        }

        this.trigger('checkRegionUpdated', this.words, this.previousState)

        this.previousState = JSON.parse(JSON.stringify(this.words))
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