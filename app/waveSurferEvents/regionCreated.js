export default (wavesurferEvents, region) => {
    const self = wavesurferEvents.parent

    if (self.isDownCtrl) {
        if (self.dummyRegion) {
            self.deleteRegionAction(self.dummyRegion)
        }
        region.isDummy = true
        self.dummyRegion = region
    }
    var numOfFiles = self.filesData.length;

    // indication when file was created by drag
    if (region.data.fileIndex === undefined) {
        // to notify "region-update" for the first update
        // (to get the start value which for some reason we don't get on "region-created")

        self.calcCurrentFileIndex(event);

        region.data.fileIndex = self.selectedFileIndex;
        // region.data.speaker = constants.UNKNOWN_SPEAKER;
        region.data.speaker = [];

        region.data.initFinished = false;
    } else {
        // fix regions if not added through drag (on drag there is no 'start')
        self.fixRegionsOrder(region);

        // when file is added by dragging, update-end will take care of history
        self.addHistory(region);
    }
    //TODO: creating a new word is bad if we want to keep the segment clear.
    if (!region.data.words || region.data.words.length === 0) {
        region.data.words = [{start: region.start, end: region.end, text: ""}];
    }

    var elem = region.element;


    // Shrink regions
    elem.style.height = 100 / numOfFiles + "%";
    // Arrange regions top to bottom
    elem.style.top = 100 / numOfFiles * parseInt(region.data.fileIndex) + "%";

    // unset handlers manual style
    elem.children[0].removeAttribute('style');
    elem.children[1].removeAttribute('style');

    // region.color = self.filesData[region.data.fileIndex].legend[region.data.speaker];
    // if (region.data.speaker !== 'EDER') {
    // region.color = self.speakersColors[region.data.speaker];
    // }

    self.regionUpdated(region);
    self.updateView();
}