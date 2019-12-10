import uuidv4 from 'uuid/v4'
export default (parent, region) => {
    if (parent.isDownCtrl) {
        if (parent.dummyRegion) {
            parent.deleteRegionAction(parent.dummyRegion)
        }
        region.data.isDummy = true
        parent.dummyRegion = region
    } else if (region.data.isDummy) {
        if (parent.dummyRegion) {
            parent.deleteRegionAction(parent.dummyRegion)
        }
        parent.dummyRegion = region
    }
    var numOfFiles = parent.filesData.length;

    // indication when file was created by drag
    if (region.data.fileIndex === undefined) {
        // to notify "region-update" for the first update
        // (to get the start value which for some reason we don't get on "region-created")

        parent.calcCurrentFileIndex(event);

        region.data.fileIndex = parent.selectedFileIndex;
        // region.data.speaker = constants.UNKNOWN_SPEAKER;
        region.data.speaker = [];

        region.data.initFinished = false;
    } else {
        // fix regions if not added through drag (on drag there is no 'start')
        parent.fixRegionsOrder(region);

        // when file is added by dragging, update-end will take care of history
        parent.addHistory(region);
    }
    //TODO: creating a new word is bad if we want to keep the segment clear.
    if (!region.data.words || region.data.words.length === 0) {
        region.data.words = [{start: region.start, end: region.end, text: '', uuid: uuidv4()}];
    }

    var elem = region.element;


    // Shrink regions
    elem.style.height = 100 / numOfFiles + "%";
    // Arrange regions top to bottom
    elem.style.top = 100 / numOfFiles * parseInt(region.data.fileIndex) + "%";

    // unset handlers manual style
    elem.children[0].removeAttribute('style');
    elem.children[1].removeAttribute('style');

    // region.color = parent.filesData[region.data.fileIndex].legend[region.data.speaker];
    // if (region.data.speaker !== 'EDER') {
    // region.color = parent.speakersColors[region.data.speaker];
    // }

    parent.regionUpdated(region);
    parent.updateView();
}