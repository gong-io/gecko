import hotkeys from 'hotkeys-js'

import * as constants from './constants'
import { splitLegendSpeakers } from './utils'

class Shortcuts {
    constructor (app) {
        this.app = app
        this.isMac = navigator.platform.indexOf('Mac') > -1
        const digits = [...Array(9)]
        const digitsString = digits.map((d, idx) => `command+${idx + 1},ctrl+${idx + 1}`).join(',')
        const digitsRegularString = digits.map((d, idx) => `alt+${idx + 1}`).join(',')
        this.hotkeysDesc = [
            {
                keyDesc: this.isMac ? '<kbd>⌘</kbd>+<kbd>S</kbd>' : '<kbd>Ctrl</kbd>+<kbd>S</kbd>',
                desc: 'Save a draft'
            },
            {
                keyDesc: this.isMac ? '<kbd>Alt</kbd>+<kbd>Space</kbd>' : '<kbd>Ctrl</kbd>+<kbd>Space</kbd>',
                desc: 'Play/pause'
            },
            {
                keyDesc: this.isMac ? '<kbd>⌘</kbd>+<kbd>↵</kbd>' : '<kbd>Ctrl</kbd>+<kbd>↵</kbd>',
                desc: 'Play region'
            },
            {
                keyDesc: this.isMac ? '<kbd>⌘</kbd>+<kbd>Backspace</kbd> / <kbd>⌘</kbd>+<kbd>Del</kbd>' : '<kbd>Ctrl</kbd>+<kbd>Backspace</kbd> / <kbd>Ctrl</kbd>+<kbd>Del</kbd>',
                desc: 'Delete region'
            },
            {
                keyDesc: this.isMac ? '<kbd>⌘</kbd>+<kbd>←</kbd> / <kbd>⌘</kbd>+<kbd>→</kbd>' : '<kbd>Ctrl</kbd>+<kbd>←</kbd> / <kbd>Ctrl</kbd>+<kbd>→</kbd>',
                desc: 'Skip backward / forward'
            },
            {
                keyDesc: this.isMac ? '<kbd>⌘</kbd>+<kbd>Shift</kbd>+<kbd>←</kbd> / <kbd>⌘</kbd>+<kbd>Shift</kbd>+<kbd>→</kbd>' : '<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>←</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>→</kbd>',
                desc: 'Previous / next region'
            },
            {
                keyDesc: this.isMac ? '<kbd>⌘</kbd>+<kbd>Alt</kbd>+<kbd>←</kbd> / <kbd>⌘</kbd>+<kbd>Alt</kbd>+<kbd>→</kbd>' : '<kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>←</kbd> / <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>→</kbd>',
                desc: 'Previous / next Discrepancy'
            },
            {
                keyDesc: this.isMac ? '<kbd>⌘</kbd>+<kbd>Z</kbd>' : '<kbd>Ctrl</kbd>+<kbd>Z</kbd>',
                desc: 'Undo'
            },
            {
                keyDesc: this.isMac ? '<kbd>⌘</kbd>+<kbd>1</kbd>...<kbd>⌘</kbd>+<kbd>9</kbd>' : '<kbd>Ctrl</kbd>+<kbd>1</kbd>...<kbd>Ctrl</kbd>+<kbd>9</kbd>',
                desc: 'Select fixed label'
            },
            {
                keyDesc: '<kbd>Alt</kbd>+<kbd>1</kbd>...<kbd>Alt</kbd>+<kbd>9</kbd>',
                desc: 'Select non-fixed label'
            },
            {
                keyDesc: this.isMac ? '<kbd>⌘</kbd>+<kbd>Click</kbd> on a word' : '<kbd>Ctrl</kbd>+<kbd>Click</kbd> on a word',
                desc: `Jump to the word's start`
            },
            {
                keyDesc: this.isMac ? '<kbd>⌘</kbd>+<kbd>←</kbd> / <kbd>⌘</kbd>+<kbd>→</kbd> when word is selected' : '<kbd>Ctrl</kbd>+<kbd>←</kbd> / <kbd>Ctrl</kbd>+<kbd>→</kbd> when word is selected',
                desc: 'Jump to previous / next word'
            }
        ]
        this.hotkeys = [
            {
                handler: (e) => this.playPauseHandler(e),
                keys: this.isMac ? 'alt+space' : 'ctrl+space'
            },
            {
                handler: (e) => this.playRegionHandler(e),
                keys: 'ctrl+enter,command+enter'
            },
            {
                handler: (e) => this.skipForwardHandler(e),
                keys: 'ctrl+right,command+right'
            },
            {
                handler: (e) => this.skipBackwardHandler(e),
                keys: 'ctrl+left,command+left'
            },
            {
                handler: (e) => this.nextRegionHandler(e),
                keys: 'ctrl+shift+right,command+shift+right'
            },
            {
                handler: (e) => this.previousRegionHandler(e),
                keys: 'ctrl+shift+left,command+shift+left'
            },
            {
                handler: (e) => this.jumpNextDiscrepancyHandler(e),
                keys: 'ctrl+alt+right'
            },
            {
                handler: (e) => this.jumpPreviousDiscrepancyHandler(e),
                keys: 'ctrl+alt+left'
            },
            {
                handler: (e) => this.undoHandler(e),
                keys: 'ctrl+z,command+z'
            },
            {
                handler: (e) => this.saveHandler(e),
                keys: 'ctrl+s,command+s'
            },
            {
                handler: (e) => this.deleteRegionHandler(e),
                keys: 'ctrl+backspace,ctrl+delete,command+backspace,command+delete'
            },
            {
                handler: (e) => this.digitHandler(e),
                keys: digitsString
            },
            {
                handler: (e) => this.digitHandler(e, true),
                keys: digitsRegularString
            }
        ]
    }

    getInfo () {
        return this.hotkeysDesc
    }

    bindKeys () {
        this.hotkeys.forEach((hk) => {
            hotkeys(hk.keys, (e, handler) => {
                hk.handler(e)
            })
        })

        hotkeys.filter = (e) => {
            if (e.target.tagName === 'EDITABLE-WORDS') {
                const isMacMeta = window.navigator.platform === 'MacIntel' && e.metaKey
                const isOtherControl = window.navigator.platform !== 'MacIntel' && e.ctrlKey
                const isDownCtrl = isMacMeta || isOtherControl
                if (isDownCtrl && !e.shiftKey && !e.altKey && (e.which === 37 || e.which === 39)) {
                    return false
                }
            }
            return true
        }
    }

    playPauseHandler (e) {
        e.preventDefault()
        this.app.playPause()
    }

    playRegionHandler (e) {
        this.app.playRegion()
    }

    deleteRegionHandler (e) {
        this.app.deleteRegionAction(this.app.selectedRegion)
    }

    skipBackwardHandler (e) {
        this.app.wavesurfer.skip(-1)
        e.preventDefault()
    }

    skipForwardHandler (e) {
        this.app.wavesurfer.skip(1)
        e.preventDefault()
    }

    previousRegionHandler (e) {
        this.app.jumpRegion(false)
    }

    nextRegionHandler (e) {
        this.app.jumpRegion(true)
    }

    undoHandler (e) {
        this.app.historyService.undo(this.app)
    }

    saveHandler (e) {
        this.app.saveToDB()
        e.preventDefault()
    }

    digitHandler (e, isRegular = false) {
        let number = e.which - 48
        if (!isNaN(number) && number >= 1 && number <= 9) {
            let index = number - 1
            if (this.app.selectedRegion) {
                let fileIndex = this.app.selectedRegion.data.fileIndex
                const { regularSpeakers, defaultSpeakers } =  splitLegendSpeakers(this.app.filesData[fileIndex].legend)
                if (isRegular && index < regularSpeakers.length) {
                    this.app.speakerChanged(regularSpeakers[index])
                } else if (!isRegular && index < defaultSpeakers.length) {
                    this.app.speakerChanged(defaultSpeakers[index])
                }
            }
        }
    }

    jumpNextDiscrepancyHandler (e) {
        this.app.discrepancyService.jumpNextDiscrepancy(this.app)
    }

    jumpPreviousDiscrepancyHandler (e) {
        this.app.discrepancyService.jumpPreviousDiscrepancy(this.app)
    }
}

export default Shortcuts
