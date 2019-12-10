export default (parent, region) => {
    parent.regionPositionUpdated(region)

    var multiEffect = [region.id]
    parent.addHistory(region)

    for (let r of parent.updateOtherRegions) {
        parent.addHistory(r)
        multiEffect.push(r.id)
    }

    parent.updateOtherRegions.clear()
    parent.undoStack.push(multiEffect)

    parent.$scope.$evalAsync()
}