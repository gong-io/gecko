import hotkeys from 'hotkeys-js'

import * as constants from './constants'

class Shortcuts {
    constructor (app) {
        this.app = app
        this.isMac = navigator.platform.indexOf('Mac') > -1
        const digits = [...Array(9)]
        const digitsString = digits.map((d, idx) => `command+shift+${idx + 1},ctrl+shift+${idx + 1}`).join(',')
        this.hotkeys = [
            {
                keyDesc: this.isMac ? '<kbd>Alt</kbd>+<kbd>Space</kbd>' : '<kbd>Ctrl</kbd>+<kbd>Space</kbd>',
                desc: 'Play/pause',
                handler: (e) => this.playPauseHandler(e),
                keys: this.isMac ? 'alt+space' : 'ctrl+space'
            },
            {
                keyDesc: this.isMac ? '<kbd>⌘</kbd>+<kbd>↵</kbd>' : '<kbd>Ctrl</kbd>+<kbd>↵</kbd>',
                desc: 'Play region',
                handler: (e) => this.playRegionHandler(e),
                keys: 'ctrl+enter,command+enter'
            },
            {
                keyDesc: this.isMac ? '<kbd>⌘</kbd>+<kbd>→</kbd>' : '<kbd>Ctrl</kbd>+<kbd>→</kbd>',
                desc: 'Skip forward',
                handler: (e) => this.skipForwardHandler(e),
                keys: 'ctrl+right,command+right'
            },
            {
                keyDesc: this.isMac ? '<kbd>⌘</kbd>+<kbd>←</kbd>' : '<kbd>Ctrl</kbd>+<kbd>←</kbd>',
                desc: 'Skip backward',
                handler: (e) => this.skipBackwardHandler(e),
                keys: 'ctrl+left,command+left'
            },
            {
                keyDesc: this.isMac ? '<kbd>⌘</kbd>+<kbd>Shift</kbd>+<kbd>→</kbd>' : '<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>→</kbd>',
                desc: 'Next region',
                handler: (e) => this.nextRegionHandler(e),
                keys: 'ctrl+shift+right,command+shift+right'
            },
            {
                keyDesc: this.isMac ? '<kbd>⌘</kbd>+<kbd>Shift</kbd>+<kbd>←</kbd>' : '<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>←</kbd>',
                desc: 'Previous region',
                handler: (e) => this.previousRegionHandler(e),
                keys: 'ctrl+shift+left,command+shift+left'
            },
            {
                keyDesc: this.isMac ? '<kbd>⌘</kbd>+<kbd>Alt</kbd>+<kbd>→</kbd>' : '<kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>→</kbd>',
                desc: 'Next Discrepancy',
                handler: (e) => this.jumpNextDiscrepancyHandler(e),
                keys: 'ctrl+alt+right'
            },
            {
                keyDesc: this.isMac ? '<kbd>⌘</kbd>+<kbd>Alt</kbd>+<kbd>←</kbd>' : '<kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>←</kbd>',
                desc: 'Previous Discrepancy',
                handler: (e) => this.jumpPreviousDiscrepancyHandler(e),
                keys: 'ctrl+alt+left'
            },
            {
                keyDesc: this.isMac ? '<kbd>⌘</kbd>+<kbd>Z</kbd>' : '<kbd>Ctrl</kbd>+<kbd>Z</kbd>',
                desc: 'Undo',
                handler: (e) => this.undoHandler(e),
                keys: 'ctrl+z,command+z'
            },
            {
                keyDesc: this.isMac ? '<kbd>⌘</kbd>+<kbd>Shift</kbd>+<kbd>1</kbd>...<kbd>⌘</kbd>+<kbd>Shift</kbd>+<kbd>9</kbd>' : '<kbd>Ctrl</kbd>+<kbd>Z</kbd>',
                desc: 'Select annotation',
                handler: (e) => this.digitHandler(e),
                keys: digitsString
            }
        ]
    }

    getInfo () {
        return this.hotkeys.map((h) => {
            const { desc, keyDesc } = h
            return {
                desc,
                key: keyDesc
            }
        })
    }

    bindKeys () {
        this.hotkeys.forEach((hk) => {
            hotkeys(hk.keys, (e, handler) => {
                hk.handler(e)
            })
        })
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
        this.app.undo()
    }

    digitHandler (e) {
        let number = e.which - 48
        if (!isNaN(number) && number >= 1 && number <= 9) {
            let index = number - 1
            if (this.app.selectedRegion) {
                let fileIndex = this.app.selectedRegion.data.fileIndex
                let speakers = Object.keys(this.app.filesData[fileIndex].legend)
                if (index < speakers.length) {
                    this.app.speakerChanged(speakers[index])
                }
            }
        }
    }

    jumpNextDiscrepancyHandler (e) {
        if (!this.app.discrepancies) return;

        let time = this.app.wavesurfer.getCurrentTime();

        let i = 0;
        for (; i < this.app.filteredDiscrepancies.length; i++) {
            if (this.app.filteredDiscrepancies[i].start > time + constants.EXTRA_DISCREPANCY_TIME) {
                break;
            }
        }

        if (this.app.filteredDiscrepancies[i]) {
            this.app.playDiscrepancy(this.app.filteredDiscrepancies[i]);
        }
    }

    jumpPreviousDiscrepancyHandler (e) {
        if (!this.app.discrepancies) return;

        let time = this.app.wavesurfer.getCurrentTime();

        let i = this.app.filteredDiscrepancies.length - 1;
        for (; i >=0; i--) {
            if (this.app.filteredDiscrepancies[i].end < time + constants.EXTRA_DISCREPANCY_TIME) {
                break;
            }
        }

        if (this.app.filteredDiscrepancies[i - 1]) {
            this.app.playDiscrepancy(this.app.filteredDiscrepancies[i - 1]);
        }
    }
}

export default Shortcuts