export default (parent) => {
    parent.updateView()
    parent.videoPlayer && parent.videoPlayer.currentTime(parent.wavesurfer.getCurrentTime())

    parent.$scope.$evalAsync()
}