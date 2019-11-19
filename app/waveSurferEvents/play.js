
export default (wavesurferEvents) => {
    const self = wavesurferEvents.parent

    self.seekingPos = ~~(self.wavesurfer.backend.getPlayedPercents() * self.length)
    self.st.tempo = self.wavesurfer.getPlaybackRate()
    self.wavesurfer.backend.disconnectFilters()

    if (self.st.tempo === 1) {
        self.wavesurfer.backend.setFilters([self.gainNode])
    } else {
        self.wavesurfer.backend.setFilters([self.soundtouchNode, self.gainNode])
    }

    self.isPlaying = true
    self.$scope.$evalAsync()
}