export default (parent, region) => {
    if (region.data.fileIndex === parent.selectedFileIndex) {
        parent.selectRegion(region)
    }
    parent.currentRegions[region.data.fileIndex] = region
}