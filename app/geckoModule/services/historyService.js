import { copyRegion } from '../utils'
import { SPEAKER_NAME_CHANGED_OPERATION_ID, REGION_TEXT_CHANGED_OPERATION_ID } from '../constants'

class HistoryService {
    constructor () {
        this.reset()
    }

    reset () {
        this.regionsHistory = {}
        this.undoStack = []
        this.updateOtherRegions = new Set()
    }

    addHistory(region) {
        if (!this.regionsHistory[region.id]) {
            this.regionsHistory[region.id] = [];
        }

        const regionCopy = copyRegion(region)
        this.regionsHistory[region.id].push(regionCopy);
    }

    undo (context) {
        if (!this.undoStack.length) {
            return;
        }

        var regionIds = this.undoStack.pop();
        let needUpdateEditable = false

        if (regionIds[0] === SPEAKER_NAME_CHANGED_OPERATION_ID) {
            let fileIndex = regionIds[1];
            let oldSpeaker = regionIds[2];
            let newSpeaker = regionIds[3];

            context.updateLegend(fileIndex, newSpeaker, oldSpeaker);

            regionIds = regionIds[4];
        } else if (regionIds[0] === REGION_TEXT_CHANGED_OPERATION_ID) {
            needUpdateEditable = true
            regionIds = [regionIds[1]]
        }


        for (let regionId of regionIds) {

            var history = this.regionsHistory[regionId];

            var lastState = history.pop();

            if (lastState === null) {
                // pop again because "region-created" will insert another to history
                const addRegion = history.pop()
                var newRegion = context.wavesurfer.addRegion(addRegion);
                context.regionPositionUpdated(newRegion);
            } else if (history.length === 0) {
                context.__deleteRegion(context.getRegion(regionId));
            } else {
                context.wavesurfer.regions.list[regionId].update(copyRegion(history[history.length - 1]));
                if (needUpdateEditable && context.selectedRegion && context.selectedRegion.id === regionId) {
                    context.$timeout(() => context.eventBus.trigger('resetEditableWords', { id: regionId }))
                }
            }
        }

        context.updateView()
        context.eventBus.trigger('rebuildProofReading')
        context.$scope.$evalAsync();
        context.cursorRegion = context.getCurrentRegion(context.selectedFileIndex)
    }
}

export default HistoryService