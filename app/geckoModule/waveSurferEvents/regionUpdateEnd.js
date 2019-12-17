export default (parent, region) => {
    parent.regionPositionUpdated(region)

    var multiEffect = [region.id]
    parent.historyService.addHistory(region)

    for (let r of parent.historyService.updateOtherRegions) {
        parent.historyService.addHistory(r)
        multiEffect.push(r.id)
    }

    parent.historyService.updateOtherRegions.clear()
    parent.historyService.undoStack.push(multiEffect)

    parent.eventBus.trigger('geckoChanged', {
        event: 'regionUpdateEnd',
        data: region
    })

    parent.$scope.$evalAsync()
}