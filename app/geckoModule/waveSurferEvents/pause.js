export default (parent) => {
    parent.olatsNode && parent.olatsNode.disconnect()
    parent.isPlaying = false
    parent.$scope.$evalAsync()
}