export default (parent, region) => {
    if (region.data.fileIndex === parent.selectedFileIndex) {
        parent.deselectRegion(region)
    }
    parent.currentRegions[region.data.fileIndex] = undefined;
}