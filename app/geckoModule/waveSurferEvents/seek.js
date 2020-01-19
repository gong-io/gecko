export default (parent) => {
    parent.updateView()
    parent.videoPlayer && parent.videoPlayer.currentTime(parent.wavesurfer.getCurrentTime())

    parent.cursorRegion = parent.getCurrentRegion(parent.selectedFileIndex)

    parent.$scope.$evalAsync()
}