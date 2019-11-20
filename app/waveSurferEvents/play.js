
export default (parent) => {
    parent.seekingPos = ~~(parent.wavesurfer.backend.getPlayedPercents() * parent.length)
    parent.st.tempo = parent.wavesurfer.getPlaybackRate()
    parent.wavesurfer.backend.disconnectFilters()

    if (parent.st.tempo === 1) {
        parent.wavesurfer.backend.setFilters([parent.gainNode])
    } else {
        parent.wavesurfer.backend.setFilters([parent.soundtouchNode, parent.gainNode])
    }

    parent.isPlaying = true
    parent.$scope.$evalAsync()
}