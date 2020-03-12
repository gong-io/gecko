export default (parent) => {
    parent.olatsNode && parent.olatsNode.disconnect()
    parent.isPlaying = false
    parent.videoPlayer && parent.videoPlayer.pause()
    parent.$scope.$evalAsync()
}