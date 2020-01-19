export default (parent, region) => {
    parent.isRegionClicked = true
    parent.selectedFileIndex = region.data.fileIndex
    parent.cursorRegion = region
}