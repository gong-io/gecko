
export default (parent) => {
    parent.buffOla.position = ~~(parent.wavesurfer.backend.getPlayedPercents() * parent.length)
    parent.buffOla.alpha = 1 / parent.wavesurfer.getPlaybackRate()

    parent.wavesurfer.backend.disconnectFilters()
    
    if (parent.wavesurfer.getPlaybackRate() === 1) {
        parent.wavesurfer.backend.setFilters([parent.gainNode])
    } else {
        parent.wavesurfer.backend.setFilters([parent.olatsNode, parent.gainNode])
    }

    parent.isPlaying = true
    parent.$scope.$evalAsync()
}