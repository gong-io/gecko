export default (parent) => {
    parent.soundtouchNode && parent.soundtouchNode.disconnect()
    parent.isPlaying = false
    parent.$scope.$evalAsync()
}