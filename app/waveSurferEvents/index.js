import readyEvent from './ready'
import playEvent from './play'
import regionCreatedEvent from './regionCreated'

export default class WaveSurferEvents {
    constructor (parent) {
        this.parent = parent
    }

    seek () {
        this.parent.updateView()
        this.parent.videoPlayer && this.parent.videoPlayer.currentTime(this.parent.wavesurfer.getCurrentTime())

        this.parent.$scope.$evalAsync()
    }

    regionUpdated (region) {
        this.parent.regionPositionUpdated(region)
    }

    regionUpdateEnd (region) {
        const self = this.parent

        self.regionPositionUpdated(region)

        var multiEffect = [region.id]
        self.addHistory(region)

        for (let r of self.updateOtherRegions) {
            self.addHistory(r)
            multiEffect.push(r.id)
        }

        self.updateOtherRegions.clear()
        self.undoStack.push(multiEffect)

        self.$scope.$evalAsync()
    }

    regionClick (region) {
        this.parent.isRegionClicked = true
        this.parent.selectedFileIndex = region.data.fileIndex
    }

    regionIn (region) {
        if (region.data.fileIndex === this.parent.selectedFileIndex) {
            this.parent.selectRegion(region)
        }
        this.parent.currentRegions[region.data.fileIndex] = region
    }

    regionOut (region) {
        if (region.data.fileIndex === this.parent.selectedFileIndex) {
            this.parent.deselectRegion(region)
        }
        this.parent.currentRegions[region.data.fileIndex] = undefined;
    }

    pause () {
        this.parent.soundtouchNode && this.parent.soundtouchNode.disconnect()
        this.parent.isPlaying = false
        this.parent.$scope.$evalAsync()
    }

    play () {
        playEvent(this)
    }

    audioProcess () {
        this.parent.updateView()
    }

    error () {
        Swal.fire({
            icon: 'error',
            title: 'Wavesurfer error',
            text: e
        })
        console.error("wavesurfer error:")
        console.log(e)
        this.parent.reset()
        if (!this.parent.isServerMode) {
            this.parent.loadClientMode()
        }
    }

    loading () {
        this.parent.$scope.$evalAsync(() => {
            this.parent.loader = true
        })
    }

    regionCreated (region, e) {
        regionCreatedEvent(this, region)
    }

    ready () {
        readyEvent(this)
    }
}