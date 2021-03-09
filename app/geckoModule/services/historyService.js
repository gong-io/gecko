import { copyRegion, prepareLegend } from '../utils'
import { OPERATION_IDS } from '../constants'

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

        if (regionIds[0] === OPERATION_IDS.SPEAKER_NAME_AND_COLOR_CHANGED) {

            for (let i = 0; i < regionIds[5].length; i++){
                let currentColorChange = regionIds[5][i];
                context.changeSpeakerColor(currentColorChange.fileIndex, currentColorChange.speaker, currentColorChange.oldColor, currentColorChange.color, false);
            }

            regionIds[0] = OPERATION_IDS.SPEAKER_NAME_CHANGED;
        }
        if (regionIds[0] === OPERATION_IDS.SPEAKER_NAME_CHANGED) {
            let fileIndex = regionIds[1];
            let oldSpeaker = regionIds[2];
            let newSpeaker = regionIds[3];

            let rep = context.filesData[fileIndex].reps[newSpeaker];
            if (rep !== {}){
                context.filesData[fileIndex].reps[oldSpeaker] = rep;
                delete context.filesData[fileIndex].reps[newSpeaker];
            }

            context.updateLegend(fileIndex, newSpeaker, oldSpeaker);

            regionIds = regionIds[4];
        } else if (regionIds[0] === OPERATION_IDS.REGION_TEXT_CHANGED) {
            needUpdateEditable = true
            regionIds = [regionIds[1]]
        } else if (regionIds[0] === OPERATION_IDS.SPEAKER_COLORS_CHANGED) {
            context.changeSpeakerColor(regionIds[1], regionIds[2], regionIds[4], regionIds[3], false)
            return
        }else if (regionIds[0] === OPERATION_IDS.SPEAKER_LABEL_ADDED) {
            let fileIndex = regionIds[1];
            let speaker = regionIds[2];
            context.filesData[fileIndex].legend = context.filesData[fileIndex].legend.filter(s => s.value != speaker);
            return;
        }else if (regionIds[0] === OPERATION_IDS.SPEAKER_LABEL_DELETED) {
            let fileIndex = regionIds[1];
            let speaker = regionIds[2];
            context.filesData[fileIndex].legend.push({
                value: speaker.value,
                name: speaker.name,
                color: speaker.color
            })
            context.filesData[fileIndex].legend = prepareLegend(context.filesData[fileIndex].legend);

            regionIds = regionIds[3];
        }else if (regionIds[0] === OPERATION_IDS.SPEAKER_LABEL_MERGED) {
            let fileIndex = regionIds[1];
            let speaker = regionIds[2];
            context.filesData[fileIndex].legend.push({
                value: speaker.value,
                name: speaker.name,
                color: speaker.color
            })
            context.filesData[fileIndex].legend = prepareLegend(context.filesData[fileIndex].legend);

            regionIds = regionIds[4];
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
                    context.$timeout(() => context.resetEditableWords(regionId))
                    context.resetEditableWords(`main_${context.selectedFileIndex}`)
                }
            }
        }

        context.updateView()
        context.$scope.$evalAsync();
        context.cursorRegion = context.getCurrentRegion(context.selectedFileIndex)
        if (context.proofReadingView) {
            context.setMergedRegions()
        }
    }
}

export default HistoryService