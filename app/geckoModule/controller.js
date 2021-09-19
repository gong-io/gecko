import uuidv4 from 'uuid/v4'
import Swal from 'sweetalert2'
import videojs from 'video.js'

import * as constants from './constants'
import initWaveSurfer from './wavesurfer.js'

import {config} from './config.js'

import Shortcuts from './shortcuts'
import wavesurferEvents from './waveSurferEvents'

import {
    parse as parseTextFormats,
    convert as convertTextFormats
} from './textFormats'

import {
    jsonStringify,
    secondsToMinutes,
    sortDict,
    copyRegion,
    parseAndLoadAudio,
    parseServerResponse,
    parseImageCsv,
    combineImageCsv,
    ZoomTooltip,
    prepareLegend,
    formatTime,
    hash,
    discrepancies
} from './utils'

import {
    loadingModal,
    shortcutsModal
} from './modals'

const CSV = require('csv-string')

class MainController {
    constructor($scope, $uibModal, toaster, dataManager, dataBase, eventBus, historyService, debounce, $timeout, $interval, $sce, store) {
        this.dataManager = dataManager;
        if (config.enableDrafts) {
            this.dataBase = dataBase;
        }
        this.eventBus = eventBus
        this.$uibModal = $uibModal;
        this.$scope = $scope;
        this.$timeout = $timeout
        this.$interval = $interval
        this.isServerMode = false
        this.proofReadingView = false
        this.searchBarView = false;
        this.searchBarText = "";
        this.shortcuts = new Shortcuts(this, constants)
//        this.shortcuts.bindKeys()
        this.toaster = toaster
        this.eventBus = eventBus
        this.historyService = historyService
        this.config = config
        this.legend = []

        this.zoomTooltipOpen = false

        this.zoomTooltip = new ZoomTooltip(this)

        this.$scope.$watch(() => this.zoomTooltipOpen, this.updateZoomTooltip.bind(this))
        this.debouncedUpdate = debounce.throttle(this.update, 300, this)

        this.$sce = $sce

        store.setValue('control', this)
        this.store = store

        this.timeSpan = document.getElementById('timeSpan')
    }

    async loadApp(config) {
        const urlParams = new URLSearchParams(window.location.search)
        const mode = urlParams.get('mode');
        if (mode && (mode == "images" || mode == "image")){
            this.dataManager.serverRequestImageList("https://gecko.research.gongio.net/s3_files/images/images.tsv").then(async (res) => {
                parseImageCsv(this, res);
                this.isImageMode = true;
            });
        }
        else{
            this.shortcuts.bindKeys();
            const saveMode = urlParams.get('save_mode')
            if (saveMode) {
                if (saveMode === 'server') {
                    this.isServerMode = true
                } else if (saveMode === 'local') {
                    this.isServerMode = false
                }
            }

            this.onlyProofreading = !!urlParams.has('OnlyProofreading');
            // console.log('Proofreading:'+ this.onlyProofreading);

            const audio = urlParams.get('audio')

            let transcriptParams = ['rttm', 'tsv', 'json', 'ctm', 'srt', 'transcript']
            transcriptParams = transcriptParams.map((f) => {
                return urlParams.get(f)
            }).filter(Boolean)

            let serverConfig = null
            if (audio || transcriptParams.length) {
                serverConfig = {
                    mode: 'server',
                    transcripts: []
                }

                if (audio) {
                    serverConfig.audio = {
                        url: audio
                    }
                }

                if (transcriptParams.length) {
                    transcriptParams.forEach(f => {
                        const fileUrls = f.split(';')
                        fileUrls.forEach((fUrl) => {
                            const fileName = fUrl.split('/').pop();
                            serverConfig.transcripts.push(
                                {
                                    url: fUrl,
                                    fileName: fileName
                                }
                            )
                        })
                    })
                }
            }
            const presignedUrl = urlParams.get('presigned_url')
            if (presignedUrl) {
                serverConfig.presignedUrl = presignedUrl
            }

            if (config.mode === 'server' || serverConfig) {
                this.loadServerMode(serverConfig ? serverConfig : config);
            } else {
                this.loadClientMode();
            }
        }
    }

        async imageOpen(index){
        this.imageIndex = index;
        return new Promise(resolve =>{
                this.dataManager.serverRequestImage("https://gecko.research.gongio.net/s3_files/" + this.imagesCsv[this.imageIndex].file_path).then(async (res) => {
                    if(res){
                        this.imageSrc = URL.createObjectURL(res.data);
                        resolve();
                    }
                    else{
                        this.imageSrc = null;
                        this.imageIndex = null;
                    }
                })
            }
        );
    }

    async imageChange(diff){
        let index = this.imageIndex;
        if (diff > 0){
            index = index + diff <  this.imagesCsv.length ? index + diff : 0;
        }
        else{
            index = index + diff >= 0 ? index + diff : this.imagesCsv.length - 1;
        }
        return this.imageOpen(index);
    }

    async backToImageList(){
        this.saveImageCsvLocal();
        this.saveImageCsvServer();
        this.imageSrc = null;
        this.imageIndex = null;
    }

    async saveImageCsvServer(popup = false){
        await combineImageCsv(this, this.imagesCsv);
        return new Promise(resolve =>{
                this.dataManager.serverSaveImageList(this.outputImagesCsv,"images/images.tsv", popup);
                resolve();
            }
        );
    }

    async saveImageCsv(){
        this.saveImageCsvLocal();
        this.saveImageCsvServer(true);
    }

    setInitialValues() {
        this.loader = false
        this.audioFileName = null
        this.currentTime = '00:00'
        this.currentTimeSeconds = 0
        this.zoomLevel = constants.ZOOM
        this.isPlaying = false
        this.playbackSpeeds = constants.PLAYBACK_SPEED
        this.currentPlaybackSpeed = 1
        this.videoMode = false
        this.showSpectrogram = false
        this.showSpectrogramButton = false
        this.spectrogramReady = false
        this.currentGainProc = 100
        this.comparsionData = []

        this.comparsionMode = false

        this.lastDraft = null
        this.currentDraftId = 0

        // history variables
        this.historyService.reset()

        this.isRegionClicked = false;

        this.mergedRegions = []

        this.cursorRegion = null

        this.editableWords = new Map()

        this.currentEditables = []

        this.loadUserConfig()
    }

    loadUserConfig () {
        let localConf = {}

        try {
            const configJSON = window.localStorage.getItem('geckoUserConfig')
            localConf = JSON.parse(configJSON)
        } catch (e) {

        }

        this.userConfig = {
            ...constants.DEFAULT_USER_CONFIG,
            ...localConf
        }
    }

    setConstants() {
        this.minGainProc = constants.MIN_GAIN * 100
        this.maxGainProc = constants.MAX_GAIN * 100
        this.maxZoom = constants.MAX_ZOOM
        this.playbackSpeeds = constants.PLAYBACK_SPEED
        if (config.wavesurfer.useSpectrogram) {
            this.showSpectrogramButton = true
        }
    }

    reset() {
        this.wavesurfer && this.wavesurfer.destroy()
        this.$scope.$evalAsync(() => {
            this.setInitialValues()
        })
    }

    init() {
        this.setConstants()
        this.setInitialValues()

        this.wavesurfer = initWaveSurfer();
        this.wavesurferElement = this.wavesurfer.drawer.container;
        this.store.setValue('audioBackend', this.wavesurfer.backend)

        this.ready = false;

        this.eventBus.on('wordClick', (word, e) => {
            this.seek(word.start, 'right')
            e.preventDefault()
            e.stopPropagation()
        })

        this.eventBus.on('split', (word, offset, region) => {
            this.splitSegmentByWord(word, offset, region)
        })

        this.eventBus.on('emptyEditorClick', (region, e) => {
            if (this.config.emptySectionClick) {
                this.seek(region.start, 'right')
                e.preventDefault()
                e.stopPropagation()
            }
        })

        this.eventBus.on('regionTextChanged', (regionId) => {
            let currentRegion = this.getRegion(regionId)
            this.historyService.addHistory(currentRegion)
            this.historyService.undoStack.push([constants.OPERATION_IDS.REGION_TEXT_CHANGED, regionId])

            // this.resetEditableWords(currentRegion)

            this.eventBus.trigger('geckoChanged', {
                event: 'regionTextChanged',
                data: currentRegion
            })
        })

        this.eventBus.on('editableFocus', (editableRegion, fileIndex) => {
            this.selectedFileIndex = fileIndex
        })

        document.onkeydown = (e) => {
            if (e.key === 'Escape') {
                if (document.activeElement) {
                    document.activeElement.blur();
                }
                return;
            }

            if (/^[0-9]$/i.test(e.key) && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
            }

            // this.shortcuts.checkKeys(e)
            this.$scope.$evalAsync()
            /* if (e.key === 'ArrowRight' && isDownCtrl) {
                self.jumpNextDiscrepancy();
            } */
        };

        this.bindWaveSurferEvents()
        this.bindDummyRegionEvents()

        if (config.enableDrafts) {
            this.$interval(() => {
                this.saveToDB()
            }, constants.SAVE_THRESHOLD)
        }
    }

    bindWaveSurferEvents() {
        this.wavesurferElement.onclick = (e) => {
            if (!this.isRegionClicked) {
                this.calcCurrentFileIndex(e);
                // self.deselectRegion();
            }

            this.isRegionClicked = false;
        };

        this.wavesurferElement.addEventListener('mousedown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                this.isDownCtrl = true
            }
        })

        this.wavesurferElement.addEventListener('mouseup', () => {
            this.isDownCtrl = false
        })

        this.wavesurfer.on('audioprocess', () => wavesurferEvents.audioProcess(this))
        this.wavesurfer.on('error', (e) => wavesurferEvents.error(this, e))
        this.wavesurfer.on('loading', () => wavesurferEvents.loading(this))
        this.wavesurfer.on('ready', () => wavesurferEvents.ready(this))
        this.wavesurfer.on('seek', () => wavesurferEvents.seek(this));
        this.wavesurfer.on('region-created', (region) => wavesurferEvents.regionCreated(this, region));
        this.wavesurfer.on('region-updated', (region) => wavesurferEvents.regionUpdated(this, region))
        this.wavesurfer.on('region-update-end', (region) => wavesurferEvents.regionUpdateEnd(this, region))
        // this.wavesurfer.on('region-in', (region) => wavesurferEvents.regionIn(this, region))
        // this.wavesurfer.on('region-out', (region) => wavesurferEvents.regionOut(this, region))
        this.wavesurfer.on('region-click', (region, e) => wavesurferEvents.regionClick(this, region, e))
        this.wavesurfer.on('pause', () => wavesurferEvents.pause(this))
    }

    bindDummyRegionEvents () {
        this.isDrag = false

        this.wavesurfer.drawer.wrapper.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'REGION') {
                if (e.ctrlKey || e.metaKey) {
                    e.stopPropagation()
                    this.isDrag = true
                    this.start = this.wavesurfer.drawer.handleEvent(e, true)
                }
            }
        }, true)

        this.wavesurfer.drawer.wrapper.addEventListener('mousemove', (e) => {
            if (this.isDrag) {
                let duration = this.wavesurfer.getDuration();
                if (!this.dragRegion) {
                    this.dragRegion = this.wavesurfer.addRegion({
                        drag: false,
                        minLength: constants.MINIMUM_LENGTH,
                        data: {
                            isDummy: true
                        }
                    })
                    this.dragRegion.element.style.background = 'repeating-linear-gradient(135deg, rgb(128, 128, 128) 20px, rgb(180, 180, 180) 40px) rgb(128, 128, 128)'
                }

                const end = this.wavesurfer.drawer.handleEvent(e);
                const startUpdate = this.wavesurfer.regions.util.getRegionSnapToGridValue(
                    this.start * duration
                );
                const endUpdate = this.wavesurfer.regions.util.getRegionSnapToGridValue(
                    end * duration
                );

                this.dragRegion.update({
                    start: Math.min(endUpdate, startUpdate),
                    end: Math.max(endUpdate, startUpdate)
                })
            }
        }, true)

        this.wavesurfer.drawer.wrapper.addEventListener('mouseup', (e) => {
            if (this.isDrag) {
                this.isDrag = false
                if (this.dragRegion) {
                    this.dragRegion.fireEvent('update-end', e)
                    this.wavesurfer.fireEvent('region-update-end', this.dragRegion, e)
                    this.dragRegion = null
                }
            }
        })
    }

    zoomIntoRegion() {
        let self = this

        if (this.selectedRegion) {
            const delta = this.selectedRegion.end - this.selectedRegion.start
            const wavesurferWidth = this.wavesurfer.container.offsetWidth

            // Zoom should be integer!
            let zoomLevel = parseInt(wavesurferWidth / delta)

            if (zoomLevel > constants.MAX_ZOOM) {
                zoomLevel = constants.MAX_ZOOM
            }

            // update zoom through watch
            this.zoomLevel = zoomLevel

            this.seek(this.selectedRegion.start)

            // Scroll in a way that small regions are in the middle
            const midPosition = (this.selectedRegion.start + this.selectedRegion.end) / 2 * zoomLevel

            // After zoom gets update, center the screen. Otherwise the zoom overrides the centeralization
            self.wavesurfer.once('zoom', () => {
                self.wavesurfer.drawer.recenterOnPosition(midPosition, true)
            })


            // const startPosition = this.selectedRegion.start * zoomLevel
            // this.wavesurfer.container.children[0].scrollLeft = startPosition
        }
    }

    async saveToDB (e) {
        if (!config.enableDrafts) {
            return
        }
        if (e) {
            e.preventDefault()
        }
        this.lastDraft = formatTime(new Date())
        this.toaster.pop('success', 'Draft saved')
        const filesData = []

        for (let i = 0; i < this.filesData.length; i++) {
            filesData.push({
                filename: this.filesData[i].filename,
                data: []
            })
            this.iterateRegions(region => {
                filesData[filesData.length - 1].data.push({
                    end: region.end,
                    start: region.start,
                    speaker: { id: region.data.speaker.join('+')},
                    words: region.data.words.map(w => {
                        return {
                            start: w.start,
                            end: w.end,
                            text: w.text,
                            confidence: w.confidence ? w.confidence : 1
                        }
                    })
                })
            }, i, true)
        }

        this.dataBase && this.dataBase.updateDraft(this.currentDraftId, filesData)
    }

    handleComparsion() {
        if (!this.comparsionMode || this.comparsionData.length !== 2 || this.filesData.length !== 2) return
        this.discrepancies = discrepancies(this.comparsionData[0], this.comparsionData[1])
        this.wavesurfer.params.autoCenter = true;
    }

    fixRegionsOrderAll () {
        this.iterateFilesRegionsBatch((region) => {
            if (region.data.isDummy) {
                return
            }

            const prev = []
            const next = []

            this.iterateFilesRegionsBatch((r, fileIndex) => {
                if (r.start < region.start - 0.01 && (!prev[fileIndex] || r.start > prev[fileIndex].start) && !r.data.isDummy) {
                    prev[fileIndex] = r
                }

                if (r.end > region.end && (!next[fileIndex] || r.end < next[fileIndex].end) && !r.data.isDummy) {
                    next[fileIndex] = r
                }
            })
    
            const prevRegion = prev[region.data.fileIndex]
            const nextRegion = next[region.data.fileIndex]
    
            if (prevRegion) {
                region.prev = prevRegion.id;
                prevRegion.next = region.id;
            } else {
                region.prev = null;
            }
    
            if (nextRegion) {
                region.next = nextRegion.id;
                nextRegion.prev = region.id;
            } else {
                region.next = null;
            }
        })
    }

    fixRegionsOrder(region) {
        if (region.data.isDummy) {
            return
        }

        var prevRegion = this.findClosestRegionToTime(region.data.fileIndex, region.start, true);

        if (prevRegion) {
            region.prev = prevRegion.id;
            prevRegion.next = region.id;
        } else {
            region.prev = null;
        }

        var nextRegion = this.findClosestRegionToTime(region.data.fileIndex, region.end);

        if (nextRegion) {
            region.next = nextRegion.id;
            nextRegion.prev = region.id;
        } else {
            region.next = null;
        }
    }

    regionPositionUpdated(region) {
        var self = this;

        self.selectRegion(region);

        if (!region.data.initFinished) {
            region.data.initFinished = true;
            this.fixRegionsOrder(region);
        }

        if (!region.data.isDummy) {
            var prevRegion = this.getRegion(region.prev);
            var nextRegion = this.getRegion(region.next);

            if (prevRegion !== null) {
                if (region.start < prevRegion.start + constants.MINIMUM_LENGTH) {
                    region.start = prevRegion.start + constants.MINIMUM_LENGTH;
                    region.end = Math.max(region.start + constants.MINIMUM_LENGTH, region.end);
                }

                if (region.start < prevRegion.end) {
                    prevRegion.end = region.start;
                    self.historyService.updateOtherRegions.add(prevRegion);
                    self.regionUpdated(prevRegion);
                }
            }

            if (nextRegion !== null) {
                if (region.end > nextRegion.end - constants.MINIMUM_LENGTH) {
                    region.end = nextRegion.end - constants.MINIMUM_LENGTH;
                    region.start = Math.min(region.start, region.end - constants.MINIMUM_LENGTH);
                }

                if (region.end > nextRegion.start) {
                    nextRegion.start = region.end;
                    self.historyService.updateOtherRegions.add(nextRegion);
                    self.regionUpdated(nextRegion);
                }
            }
        }

        self.setMergedRegions()

        self.regionUpdated(region);
    }

    // change region visually
    regionUpdated(region) {
        // fix first and last words
        let words = region.data.words;
        words[0].start = region.start;
        words[words.length - 1].end = region.end;

        region.element.style.background = '';

        if (region.data.speaker.length === 0) {
            region.color = constants.UNKNOWN_SPEAKER_COLOR;

            if (region.data && region.data.isDummy) {
                region.element.style.background = 'repeating-linear-gradient(135deg, rgb(128, 128, 128) 20px, rgb(180, 180, 180) 40px) rgb(128, 128, 128)'
            }
        } else if (region.data.speaker.length === 1) {
            const legendSpeaker = this.filesData[region.data.fileIndex].legend.find(s => s.value === region.data.speaker[0])
            region.color = legendSpeaker.color
        } else {
            let line_width = 20;

            let colors = region.data.speaker.map((speaker, i) => {
                const legendSpeaker = this.filesData[region.data.fileIndex].legend.find(s => s.value === speaker)
                return `${legendSpeaker.color} ${(i + 1) * line_width}px`
            }
            ).join(',');

            region.element.style.background =
                `repeating-linear-gradient(135deg, ${colors})`

        }

        //TODO: This also happens at other times so we cannot determine things after it
        // unless we fork the repo and set an "afterrender" event so we could change the region however we'd like
        region.updateRender();

        // region.element.title = region.data.speaker;

        this.$scope.$evalAsync();
    }

    insertDummyRegion() {
        const {dummyRegion} = this
        const truncateRegions = []

        this.iterateRegions(region => {
            let overlap = false
            if (region.start >= dummyRegion.start && region.end <= dummyRegion.end
                || region.start <= dummyRegion.end && region.end >= dummyRegion.end
                || region.start <= dummyRegion.start && region.end <= dummyRegion.end && region.end >= dummyRegion.start) {
                overlap = true
            }

            if (overlap && region !== dummyRegion) {
                truncateRegions.push(region)
            }
        }, this.selectedFileIndex)

        if (truncateRegions.length) {
            const newRegionWords = []
            let regionsToDel = []
            let regionsToAdd = []
            truncateRegions.forEach(r => {
                const words = JSON.parse(JSON.stringify(r.data.words))
                words.forEach(w => {
                    const wordLength = w.end - w.start
                    if (w.start >= dummyRegion.start && w.start + wordLength / 2 <= dummyRegion.end) {
                        newRegionWords.push(w)
                    }
                })
                if (r.start <= dummyRegion.start && r.end >= dummyRegion.end) {
                    /* dummy region is fully overlaped*/
                    let first = copyRegion(r)
                    let second = copyRegion(r)
                    regionsToDel.push(first.id)

                    delete first.id
                    delete second.id

                    first.end = dummyRegion.start
                    second.start = dummyRegion.end

                    let words = JSON.parse(JSON.stringify(r.data.words))
                    let i
                    for (i = 0, length = words.length; i < length; i++) {
                        const wordLength = words[i].end - words[i].start
                        if (words[i].start + wordLength / 2 > dummyRegion.start) break
                    }

                    first.data.words = words.slice(0, i)

                    for (i = 0, length = words.length; i < length; i++) {
                        const wordLength = words[i].end - words[i].start
                        if (words[i].start + wordLength / 2 > dummyRegion.end) break
                    }
                    second.data.words = words.slice(i)

                    this.__deleteRegion(r)
                    first = this.wavesurfer.addRegion(first)
                    second = this.wavesurfer.addRegion(second)
                    regionsToAdd.push(first.id)
                    regionsToAdd.push(second.id)
                }
                else if (r.start >= dummyRegion.start && r.end <= dummyRegion.end) {
                    /* region is fully overlaped */
                    regionsToDel.push(r.id)
                    this.__deleteRegion(r)
                } else if (r.start <= dummyRegion.end && r.end >= dummyRegion.end) {
                    /* region is overlaped from right side */
                    let original = copyRegion(r)
                    regionsToDel.push(original.id)

                    delete original.id
                    original.start = dummyRegion.end

                    let words = JSON.parse(JSON.stringify(r.data.words))
                    let i
                    for (i = 0, length = words.length; i < length; i++) {
                        const wordLength = words[i].end - words[i].start
                        if (words[i].start + wordLength / 2 > dummyRegion.end) break
                    }

                    original.data.words = words.slice(i)

                    this.__deleteRegion(r)
                    original = this.wavesurfer.addRegion(original)
                    regionsToAdd.push(original.id)
                } else if (r.start <= dummyRegion.start && r.end <= dummyRegion.end && r.end >= dummyRegion.start) {
                    /* region is overlaped from left side */
                    let original = copyRegion(r)
                    regionsToDel.push(original.id)

                    delete original.id
                    original.end = dummyRegion.start

                    let words = JSON.parse(JSON.stringify(r.data.words))
                    let i
                    for (i = 0, length = words.length; i < length; i++) {
                        const wordLength = words[i].end - words[i].start
                        if (words[i].start + wordLength / 2 > dummyRegion.start) break
                    }

                    original.data.words = words.slice(0, i)

                    this.__deleteRegion(r)
                    original = this.wavesurfer.addRegion(original)
                    regionsToAdd.push(original.id)
                }
            })

            const newRegion = this.wavesurfer.addRegion({
                start: dummyRegion.start,
                end: dummyRegion.end,
                data: {
                    initFinished: true,
                    fileIndex: this.selectedFileIndex,
                    speaker: [],
                    words: newRegionWords
                },
                drag: false,
                minLength: constants.MINIMUM_LENGTH
            })

            regionsToDel.push(dummyRegion.id)
            const changedIds = [newRegion.id, ...regionsToAdd, ...regionsToDel]

            this.historyService.undoStack.push(changedIds)
            regionsToDel.forEach((id) => this.historyService.regionsHistory[id].push(null))

            this.dummyRegion.remove()
            this.dummyRegion = null

            this.seek(newRegion.start, 'right')
        } else {
            /* insert a silent region */
            const newRegion = this.wavesurfer.addRegion({
                start: dummyRegion.start,
                end: dummyRegion.end,
                data: {
                    initFinished: true,
                    fileIndex: this.selectedFileIndex,
                    speaker: [],
                    words: []
                },
                drag: false,
                minLength: constants.MINIMUM_LENGTH
            })

            const toDel = dummyRegion.id
            const changedIds = [newRegion.id, toDel]
            this.historyService.undoStack.push(changedIds)
            this.historyService.regionsHistory[toDel].push(null)

            this.dummyRegion.remove()
            this.dummyRegion = null

            this.seek(newRegion.start, 'right')
        }

        this.setMergedRegions()
    }

    update () {
        const time = this.wavesurfer.getCurrentTime()
        const currentRegions = []
        const silenceNext = []
        const silencePrev = []

        this.iterateFilesRegionsBatch((r, fileIndex) => {
            if (time >= r.start - constants.TOLERANCE && time <= r.end + constants.TOLERANCE) {
                currentRegions[fileIndex] = r
            }

            if (r.end > time && (!silenceNext[fileIndex] || r.end < silenceNext[fileIndex].end) && !r.data.isDummy) {
                silenceNext[fileIndex] = r
            }

            if (r.start < time - 0.01 && (!silencePrev[fileIndex] || r.start > silencePrev[fileIndex].start) && !r.data.isDummy) {
                silencePrev[fileIndex] = r
            }
        })
        
        return {
            currentRegions,
            silenceNext,
            silencePrev
        }
    }

    colorFoundWords(words) {
        if (this.proofReadingView) {
            if (!words){
                for (let i = 0; i < this.mergedRegions[this.selectedFileIndex].length; i++){
                    this.mergedRegions[this.selectedFileIndex][i].regions.forEach(region => {
                    const editableWord = this.editableWords.get(region.id)
                    editableWord.resetFound()
                    });
                }
            }
            else{
                for (let i = 0; i < words.length; i++){
                    let region = words[i].region;
                    const editableWord = this.editableWords.get(region.id)
                    editableWord.setFound(words[i].uuid)
                }
            }
        }
    }

    setCurrentRegions (currentRegions) {
        for (let i = 0; i < this.filesData.length; i++) {
            const currentRegion = currentRegions[i];
            if (currentRegion && currentRegion !== this.currentRegions[i]) {
                if (this.proofReadingView) {
                    if (currentRegion !== this.selectedRegion) {
                        this.resetEditableWords(this.selectedRegion)
                    }
                    if (this.isPlaying && config.proofreadingAutoScroll) {
                        this.eventBus.trigger('proofReadingScrollToRegion', currentRegion)
                    }
                } else {
                    if (currentRegion !== this.selectedRegion) {
                        this.resetEditableWords(this.selectedRegion)
                    } else {
                        this.resetEditableWords(currentRegion)
                    }
                }
            } else if (currentRegion) {
                const toReset = this.editableWords.get(currentRegion.id)
                toReset && toReset.resetSelected()
            }
            this.currentRegions[i] = currentRegion
        }

        if (currentRegions) {
            this.cursorRegion = currentRegions[this.selectedFileIndex]
            if (this.selectedRegion) {
                this.selectedRegion.element.classList.remove('selected-region')
            }
            this.selectedRegion = this.cursorRegion
            this.selectedRegion && this.selectedRegion.element.classList.add('selected-region')
            this.$timeout(() => {
                this.updateSelectedWordInFiles()
            })
        }
    }

    setSilence (silencePrev, silenceNext) {
        const silence = { start: 0, end: null }
        const afterRegion = silenceNext[this.selectedFileIndex]
        const beforeRegion = silencePrev[this.selectedFileIndex]

        if (!afterRegion) {
            silence.end = this.wavesurfer.getDuration();
            if (beforeRegion) {
                silence.start = beforeRegion.end;
            }
        } else {
            silence.end = afterRegion.start;
        }

        if (beforeRegion) {
            silence.start = beforeRegion.end;
        }

        this.silence = silence
    }

    updateView () {
        this.debouncedUpdate().then(({ currentRegions, silenceNext, silencePrev }) => {
            this.setCurrentRegions(currentRegions)
            this.setSilence(silencePrev, silenceNext)
            this.setCurrentTime()
        })
        this.comparsion && this.comparsion.updateSelectedDiscrepancy()
    }


    speakersFilterColor (items, legend) {
        if (items && items.length) {
            const spans = items.map(s => {
                const legendItem = legend.find(l => l.value === s)
                if (legendItem)
                    return `<span style="color: ${legendItem.color};">${s}</span>`
            })
            return spans.join(', ')
        } else if (items && !items.length) {
            return 'No speaker'
        }
        return ''
    }

    toMMSS (seconds) {
        return seconds ? new Date(seconds * 1000).toISOString().substr(14, 5) : '00:00'
    }

    setMergedRegions() {
        for (let i = 0; i < this.filesData.length; i++) {
            const ret = []
            this.iterateRegions((r) => {
                if (!r.data.isDummy) {
                    ret.push(r)
                }
            }, i, true)
            this.mergedRegions[i] = ret.reduce((acc, current) => {
                const last = acc[acc.length - 1]
                if (last && last.regions && last.regions.length) {
                    if (angular.equals(last.regions[0].data.speaker, current.data.speaker)) {
                        last.regions.push(current)
                    } else {
                        acc.push({ hash: '', regions: [current] })
                    }
                } else {
                    acc.push({ hash: '', regions: [current] })
                }
                return acc
            }, [])

            for (let j = 0, l = this.mergedRegions[i].length; j < l; j++) {
                const hashStr = this.mergedRegions[i][j].regions.map(r => r.id).join('-')
                this.mergedRegions[i][j].hash = hash(hashStr)
                const firstRegion = this.mergedRegions[i][j].regions[0]
                const lastRegion = this.mergedRegions[i][j].regions[this.mergedRegions[i][j].regions.length - 1]
                const speakers =  this.$sce.trustAsHtml(this.speakersFilterColor(firstRegion.data.speaker, this.filesData[i].legend))
                const timing = `${this.toMMSS(firstRegion.start)}-${this.toMMSS(lastRegion.end)}`
                this.mergedRegions[i][j].info = this.$sce.trustAsHtml(`<p class="proofreading__speaker">${speakers}</p>
                                                 <p class="proofreading__timing">${timing}</p>`)
            }
        }
    }

    calcContextMenuFileIndex(e) {
        if (this.filesData.length <= 1) {
            this.contextMenuFileIndex = 0
            return
        }
        
        if (e.target.tagName === 'REGION') {
            const regionId = e.target.getAttribute('data-id')
            const region = this.getRegion(regionId)
            this.contextMenuFileIndex = region.data.fileIndex
        } else {
            var scrollBarHeight = 20;
            var wavesurferHeight = this.wavesurfer.getHeight() - scrollBarHeight;
            // vertical click location
            var posY = e.pageY - e.target.offsetTop;
            let index = parseInt(posY / wavesurferHeight * this.filesData.length)
            if (index > this.filesData.length - 1) {
                this.contextMenuFileIndex = this.filesData.length - 1
            } else {
                this.contextMenuFileIndex = index
            }
        }
    
        
    }

    calcCurrentFileIndex(e) {
        if (this.filesData.length <= 1) {
            this.selectedFileIndex = 0
            return
        }

        var scrollBarHeight = 20;
        var wavesurferHeight = this.wavesurfer.getHeight() - scrollBarHeight;
        // vertical click location
        var posY = e.pageY - e.target.offsetTop;
        let index = parseInt(posY / wavesurferHeight * this.filesData.length)

        if (index > this.filesData.length - 1) {
            this.selectedFileIndex = this.filesData.length - 1
        } else {
            this.selectedFileIndex = index
        }
    }

    deselectRegion(region) {
        if (region !== undefined) {
            region.element.classList.remove('selected-region');
            if (this.selectedRegion === region) {
                this.selectedRegion = undefined;
            }
        } else if (this.selectedRegion) {
            if (this.selectedRegion.element) {
                this.selectedRegion.element.classList.remove('selected-region');
            }
            this.selectedRegion = undefined;
        }
    }

    resetEditableWords (region, uuid) {
        if (!region) {
            return
        }
        const toReset = this.editableWords.get(region.id ? region.id : region)
        toReset && toReset.resetEditableWords()
    }

    getCurrentRegion(fileIndex) {
        let region;

        var time = this.wavesurfer.getCurrentTime();
        this.iterateRegions((r) => {
            if (time >= r.start - constants.TOLERANCE && time <= r.end + constants.TOLERANCE) {
                region = r;
                return "STOP";
            }
        }, fileIndex);

        return region;
    }

    selectRegion(region) {
        if (!region) {
            region = this.currentRegions[this.selectedFileIndex]
        }

        this.deselectRegion();

        if (!region) {
            return
        }

        region.element.classList.add('selected-region');

        this.selectedRegion = region;
    }

    jumpRegion(next) {
        var region;

        if (this.selectedRegion) {
            if (next) {
                region = this.wavesurfer.regions.list[this.selectedRegion.next];
            } else {
                region = this.wavesurfer.regions.list[this.selectedRegion.prev];
            }
        } else {
            if (next) {
                region = this.findClosestRegionToTime(this.selectedFileIndex, this.wavesurfer.getCurrentTime());
            } else {
                region = this.findClosestRegionToTime(this.selectedFileIndex, this.wavesurfer.getCurrentTime(), true);
            }
        }

        if (region) {
            region.play();
        }
    }

    updateSelectedWordInFile(fileIndex) {
        var self = this;

        this.currentEditables[fileIndex] && this.currentEditables[fileIndex].resetSelected()

        let time = self.wavesurfer.getCurrentTime();

        let region = self.currentRegions[fileIndex];
        if (!region) return;

        let editable
        if (this.proofReadingView) {
            editable = this.editableWords.get(region.id)
        } else {
            editable = this.editableWords.get(`main_${fileIndex}`)
        }

        editable.resetSelected()

        let words = region.data.words;
        if (!words) return;

        words.forEach(word => {
            if (word.start <= time && word.end >= time) {
                editable.setSelected(word.uuid)
            }
        });

        this.currentEditables[fileIndex] = editable
    }

    updateSelectedWordInFiles() {
        for (let i = 0; i < this.filesData.length; i++) {
            this.updateSelectedWordInFile(i);
        }
    }

    getRegion(id) {
        if (!id) {
            return null;
        }

        return this.wavesurfer.regions.list[id];
    }

    iterateRegions(func, fileIndex, sort) {
        var regions = this.wavesurfer.regions.list;
        let stop = false;
        if (sort) {
            regions = sortDict(regions, 'start');
            /* iterate regions as Map */
            for (var [key, region] of regions) {
                if (fileIndex !== undefined && region.data.fileIndex !== fileIndex) {
                    continue
                }
                stop = func(region)
                if (stop == "STOP")return
            }
        } else {
            for (key in regions) {
                const region = regions[key];
                if (fileIndex !== undefined && region.data.fileIndex !== fileIndex) {
                    continue
                }
                stop = func(region)
                if (stop == "STOP")return
            }
        }
    }

    iterateFilesRegionsBatch (...funcs) {
        const regions = this.wavesurfer.regions.list
        for (let key in regions) {
            const region = regions[key]
            funcs.forEach(func => {
                func(region, region.data.fileIndex)
            })
        }
    }

    findClosestRegionToTime(fileIndex, time, before) {
        // Assuming time is not contained in any region
        var closest = null;
        this.iterateRegions((region) => {
            if (before) {
                if (region.start < time - 0.01 && (closest === null || region.start > closest.start) && !region.data.isDummy) {
                    closest = region;
                }
            } else {
                if (region.end > time && (closest === null || region.end < closest.end) && !region.data.isDummy) {
                    closest = region;
                }
            }

        }, fileIndex);

        return closest;
    }

    findClosestRegionToTimeBackward(fileIndex, time) {
        var closest = null;
        this.iterateRegions((region) => {
            if (region.end < time && (closest === null || region.end > closest.end)) {
                closest = region;
            }
        }, fileIndex);

        return closest;
    }

    createSpeakerLegends() {
        var self = this;

        let defaultSpeakers = []
        if (this.fileSpeakerColors) {
            defaultSpeakers = constants.defaultSpeakers.map(ds => {
                if (this.fileSpeakerColors[ds.value]) {
                    return {
                        ...ds,
                        color: this.fileSpeakerColors[ds.value]
                    }
                }
                return ds
            })
        } else {
            defaultSpeakers = constants.defaultSpeakers
        }

        // First aggregate all speakers, overwrite if "color" field is presented anywhere.
        // We set the same speaker for different files with the same color this way,
        // // determined by the last "color" field or one of the colors in the list
        let speakersColors = defaultSpeakers.map(ds => {
            return {
                ...ds,
                isDefault: true
            }
        })

        self.filesData.forEach((fileData, index) => {
            fileData.legend = [ ...speakersColors ]
            fileData.data.forEach(monologue => {
                if (!monologue.speaker.id) return;

                let speakerId = monologue.speaker.id;
                let speakerName = "name" in monologue.speaker ? monologue.speaker.name : '';

                if (speakerId === constants.UNKNOWN_SPEAKER) {
                    speakerId = '';
                }

                let speakers = String(speakerId).split(constants.SPEAKERS_SEPARATOR).filter(x => x);

                // TODO: remove and put colors as metadata outside monologues
                // also, maybe save representativeStart,representativeStart there too
                if (speakers.length === 1) {
                    // forcefully set the color of the speaker
                    if (monologue.speaker.color) {
                        const foundSpeaker = speakersColors.find(sc => sc.value === speakerId)
                        if (foundSpeaker) {
                            foundSpeaker.color = monologue.speaker.color
                        }
                    }
                }

                speakers.forEach(s => {
                    var found = fileData.legend.find(sc => sc.value === s)
                    // Encounter the speaker id for the first time (among all files)

                    if (!found) {
                        var newSpeaker = this.legend.find(sc => sc.value === s)
                        if (speakerName != '' && !newSpeaker){
                            newSpeaker = this.legend.find(sc => sc.name === speakerName);
                            if (newSpeaker){
                                newSpeaker = JSON.parse(JSON.stringify(newSpeaker));
                                newSpeaker.value = s;
                            }
                        }
                        if (!newSpeaker)
                            newSpeaker = {
                                value: s,
                                name: speakerName,
                                color : this.fileSpeakerColors && this.fileSpeakerColors[s] ? this.fileSpeakerColors[s] : null
                            }
                        fileData.legend.push(newSpeaker)
                    }
                });
            })

            fileData.legend = prepareLegend(fileData.legend, this.legend)
            this.legend.push(...fileData.legend);
            this.legend = this.legend.filter(el => !speakersColors.includes(el));
        });
    }

    addRegions() {
        var self = this;
        self.totalDuration = self.wavesurfer.getDuration();

        self.currentRegions = [];

        const duration = self.wavesurfer.getDuration()

        self.filesData.forEach((fileData, fileIndex) => {
            let monologues = fileData.data;

            if (!monologues.length) return;

            var last_end = monologues[0].start;

            for (let i = 0, length = monologues.length; i < length; i++) {
                var monologue = monologues[i];

                var speakerId = '';
                var speakerName = '';
                if (monologue.speaker) {
                    speakerId = monologue.speaker.id.toString();
                    speakerName = "name" in monologue.speaker ? monologue.speaker.name : '';
                }

                if (speakerId === constants.UNKNOWN_SPEAKER) {
                    speakerId = '';
                }

                var start = monologue.start;
                var end = monologue.end;

                if (start > duration) {
                    continue
                }


                // check overlapping with accuracy up to 5 decimal points
                // else if (last_end > start + 0.00001) {
                if (last_end > start + constants.TOLERANCE) {
                    console.error(`overlapping monologues. file index: ${fileIndex} time: ${last_end.toFixed(2)}`);
                }

                last_end = end;

                //region.element.innerText = speaker;
                const region = this.wavesurfer.addRegion({
                    start: start,
                    end: end,
                    data: {
                        initFinished: true,
                        fileIndex: fileIndex,
                        speaker: speakerId.split(constants.SPEAKERS_SEPARATOR).filter(x => x), //removing empty speaker
                        speakerName: speakerName,
                        words: monologue.words.map((w) => {
                            return {
                                ...w,
                                uuid: uuidv4()
                            }
                        })
                    },
                    drag: false,
                    minLength: constants.MINIMUM_LENGTH
                });

                // if (speakerId === 'EDER') {
                //     region.color = monologue.speaker.color;
                // }

            }

            self.currentRegions.push(undefined);
        })
        this.fixRegionsOrderAll()
        this.setMergedRegions()
        this.updateView()
    }

    changeTimingForWordsWithSameTiming(words){
        let prev = -1;
        var changes = false;
        let indexStart = -1;
        for (let i = 0; i < words.length; i++){
            if (words[i].start == prev){
                if(indexStart == -1){
                    indexStart = i - 1;
                }
            }
            else{
                if(indexStart > -1){
                    var wordDuration =  (words[indexStart].end - words[indexStart].start) / (i - indexStart);
                    for(let j=indexStart; j < i; j++){
                        words[j].start = Math.round((words[j].start + (wordDuration * (j - indexStart))) * 100) / 100;
                        words[j].end = Math.round((words[j].start + wordDuration) * 100) / 100;
                        changes = true;
                    }
                    indexStart = -1;
                }
                prev = words[i].start;
            }
        }
        return [words, changes];
    }


    splitSegmentByWord (word, offset, region) {
        let { end, start, text } = word
        let first = copyRegion(region)
        let second = copyRegion(region)

        if (config.interpolateTimings && needInterpolateRegionTimings(region)) {
            const interpolated = interpolateRegionTimings(region)
            interpolated.forEach((t, idx) => {
                first.data.words[idx].start = t.start
                second.data.words[idx].start = t.start

                first.data.words[idx].end = t.end
                second.data.words[idx].end = t.end
            })

            const newWord = first.data.words.find(w => w.uuid === word.uuid)
            end = newWord.end
            start = newWord.start
        }

        const timeDelta = end - start
        const wordLength = text.length
        const percent = offset / wordLength
        const timeOffset = percent * timeDelta
        let time = start + timeOffset - constants.TIME_OFFSET

        delete first.id;
        delete second.id;
        let changeToWords;
        let words = JSON.parse(JSON.stringify(first.data.words));
        let i;

        [ words, changeToWords ] = this.changeTimingForWordsWithSameTiming(words);

        for (i = 0, length = words.length; i < length; i++) {
            if (words[i].uuid === word.uuid) break;
            //if (words[i].end > time) break;
        }

        first.data.words = words.slice(0, i);
        second.data.words = words.slice(i);


        if (changeToWords){
            first.end = words[i].start;
            second.start = words[i].start;
        }
        else{
            first.end = time;
            second.start = time;
        }

        if (offset !== 0 && offset !== wordLength) {
            var prev = first.data.words[first.data.words.length - 1]
            if (prev.text != text){
                let add = {...second.data.words[0]};
                first.data.words.push(add);
                prev = first.data.words[first.data.words.length - 1]
            }
            prev.text = text.substr(0, offset)
            prev.end = time

            if (second.data.words[0].uuid === word.uuid){
                second.data.words.shift(0);
            }
            second.data.words.unshift({
                start: start + timeOffset,
                end,
                uuid: uuidv4(),
                text: text.substr(offset)
            })
        }

        this.__deleteRegion(region);
        first = this.wavesurfer.addRegion(first);
        second = this.wavesurfer.addRegion(second);

        //the list order matters!
        this.historyService.undoStack.push([first.id, second.id, region.id])
        this.historyService.regionsHistory[region.id].push(null);

        this.eventBus.trigger('geckoChanged', {
            event: 'splitSegment',
            data: [first.id, second.id, region.id]
        })

        this.setMergedRegions()
        this.seek(time)
    }

    splitSegment() {
        let region = this.selectedRegion;
        const cursorRegion = this.getCurrentRegion(this.selectedFileIndex)
        if (!region || region.data.isDummy || region !== cursorRegion) return;
        let time = this.wavesurfer.getCurrentTime();

        let first = copyRegion(region);
        let second = copyRegion(region);

        delete first.id;
        delete second.id;
        first.end = time;
        second.start = time;

        let words = JSON.parse(JSON.stringify(region.data.words));
        let i;
        for (i = 0, length = words.length; i < length; i++) {
            if (words[i].start > time) break;
        }

        first.data.words = words.slice(0, i);
        second.data.words = words.slice(i);

        this.__deleteRegion(region);
        first = this.wavesurfer.addRegion(first);
        second = this.wavesurfer.addRegion(second);

        //the list order matters!
        this.historyService.undoStack.push([first.id, second.id, region.id])
        this.historyService.regionsHistory[region.id].push(null);

        this.eventBus.trigger('geckoChanged', {
            event: 'splitSegment',
            data: [first.id, second.id, region.id]
        })

        this.setMergedRegions()
        this.seek(time)
    }

    deleteRegionAction(region) {
        const cursorRegion = this.getCurrentRegion(this.selectedFileIndex)
        if (!region || (!region.data.isDummy && (cursorRegion !== region))) return;

        this.historyService.undoStack.push([region.id]);
        this.historyService.regionsHistory[region.id].push(null);

        this.__deleteRegion(region);

        this.eventBus.trigger('geckoChanged', {
            event: 'deleteRegion',
            data: region
        })

        this.setMergedRegions()

        this.updateView();
    }

    __deleteRegion(region) {
        if (!region) return;

        if (region.data && region.data.isDummy) {
            this.dummyRegion = null
        }

        var prev = this.getRegion(region.prev);
        if (prev) prev.next = region.next;

        var next = this.getRegion(region.next);
        if (next) next.prev = region.prev;

        this.deselectRegion();
        region.remove();
    }

    setPlaybackSpeed(speed) {
        this.currentPlaybackSpeed = speed;
        this.videoPlayer && this.videoPlayer.playbackRate(speed)
        this.wavesurfer.setPlaybackRate(speed);
    }

    playPause() {
        if (this.isPlaying) {
            this.wavesurfer.pause()
        } else {
            this.wavesurfer.play()
        }
    }

    playRegion() {
        try {
            if (this.playRegionClicked) {
                this.cancelPlayRegionClick = true
                return
            }
        
            this.playRegionClicked = true
        
            this.$timeout(() => {
                if (this.cancelPlayRegionClick) {
                    this.cancelPlayRegionClick = false;
                    this.playRegionClicked = false;
                    return;
                }
    
                if (this.selectedRegion) {
                    this.selectedRegion.play()
                }
                // play silence region
                else {
                    var silence = this.calcSilenceRegion()
                    this.wavesurfer.play(silence.start, silence.end)
                }
    
                this.cancelPlayRegionClick = false
                this.playRegionClicked = false
            }, 250)
        } catch (e) {
            this.cancelPlayRegionClick = false
            this.playRegionClicked = false
        }
    }

    playRegionFromCurrentTime() {
        this.$timeout(() => {
            if (this.selectedRegion) {
                if (this.selectedRegion.end - this.wavesurfer.getCurrentTime() < 0.1) {
                    this.selectedRegion.play()
                } else {
                    this.wavesurfer.play(this.wavesurfer.getCurrentTime(), this.selectedRegion.end)
                }
            }
            // play silence region
            else {
                var silence = this.calcSilenceRegion()
                this.wavesurfer.play(silence.end - this.wavesurfer.getCurrentTime() < 0.1 ? silence.start : this.wavesurfer.getCurrentTime(), silence.end)
            }
        })
    }

    calcSilenceRegion() {
        var silence = {start: 0, end: null};
        var afterRegion = this.findClosestRegionToTime(this.selectedFileIndex, this.wavesurfer.getCurrentTime());
        var beforeRegion = this.findClosestRegionToTime(this.selectedFileIndex, this.wavesurfer.getCurrentTime(), true);

        if (afterRegion && beforeRegion) {
            if (beforeRegion.end > afterRegion.start) {
                beforeRegion = this.findClosestRegionToTime(this.selectedFileIndex, beforeRegion.start, true);
            }
        }

        if (afterRegion === null) {
            silence.end = this.wavesurfer.getDuration();
            if (beforeRegion !== null) {
                silence.start = beforeRegion.end;
            }
        } else {
            silence.end = afterRegion.start;
        }

        if (beforeRegion !== null) {
            silence.start = beforeRegion.end;
        }

        return silence;
    }

    toggleAutoCenter() {
        this.wavesurfer.params.autoCenter = !this.wavesurfer.params.autoCenter;
    }

    toggleSearchBar() {
        this.searchBarView = !this.searchBarView;
        if (this.searchBarView){
            let i = this.proofReadingView ? 1 : 0;
            setTimeout(() => {
                document.getElementsByClassName("search-bar")[i].getElementsByClassName("SearchBarInput")[0].focus();
            }, 500);
        }
    }

    setCurrentTime() {
        this.currentTimeSeconds = this.wavesurfer.getCurrentTime()
        this.currentTime = secondsToMinutes(this.currentTimeSeconds)
        this.timeSpan.textContent = `${this.currentTime} / ${this.totalTime}`
    }

    async save(extension, converter) {
        for (var i = 0; i < this.filesData.length; i++) {
            var current = this.filesData[i];
            if (current.data) {
                // convert the filename to "rttm" extension
                var filename = current.filename.substr(0, current.filename.lastIndexOf('.')) + '.' + extension;

                if (!this.checkValidRegions(i)) return;

                this.dataManager.downloadFileToClient(converter(i), filename);
            }
        }
        this.saveToDB()
    }

    async saveS3() {
        try {
            if (this.dataBase) {
                await this.dataBase.clearDB()
            }
        } catch (e) {
        }
        const fileNameSpl = this.filesData[0].filename.split('.')
        const extension = fileNameSpl[fileNameSpl.length - 1]
        const converter = convertTextFormats(extension, this, config.parserOptions)
        for (var i = 0; i < this.filesData.length; i++) {
            var current = this.filesData[i];
            if (current.data) {
                var filename = current.filename.substr(0, current.filename.lastIndexOf('.')) + '.' + extension;

                if (!this.checkValidRegions(i)) return;
                try {
                    if (this.serverConfig && this.serverConfig.presignedUrl) {
                        this.dataManager.saveToPresigned(converter(i), { url: this.serverConfig.presignedUrl});
                    } else {
                        this.dataManager.saveDataToServer(converter(i), {filename, s3Subfolder: current.s3Subfolder});
                    }
                } catch (e) {

                }
            }
        }
        this.saveToDB()
    }

    saveDiscrepancyResults() {
        const csv = this.comparsion.discrepancyToCSV()
        this.dataManager.downloadFileToClient(csv,
            this.filesData[0].filename + '_VS_' + this.filesData[1].filename + '.csv');
    }

    saveClient(extension) {
        this.save(extension, convertTextFormats(extension, this, config.parserOptions))
    }

    checkValidRegions(fileIndex) {
        var self = this;
        try {
            var last_end = 0;
            this.iterateRegions((region) => {
                if (region.end <= region.start) {
                    throw `Negative duration in file ${self.filesData[fileIndex].filename}\n Start: ${region.start}\n End: ${region.end}`
                }

                if (last_end > region.start + constants.TOLERANCE) {
                    throw `Overlapping in file: ${self.filesData[fileIndex].filename}. \n Time: ${last_end.toFixed(2)}`;
                }
                last_end = region.end;
            }, fileIndex, true)
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Check regions error',
                text: err
            })
            return false;
        }
        return true;
    }

    formatSpeaker(speaker) {
        var ret = ''

        if (speaker.length === 0) {
            ret = constants.UNKNOWN_SPEAKER;
        } else {
            ret = speaker.join(constants.SPEAKERS_SEPARATOR);
        }

        return ret;
    }

    speakerChanged(speaker, isFromContext = false, event = null) {
//        console.log(speaker)

        var self = this;
        const currentRegion = isFromContext ? self.contextMenuRegion : self.selectedRegion

        if (isFromContext && !this.contextMenuRegion) {
            this.fillRegion(speaker, event)
            return
        }

        var speakers = currentRegion.data.speaker
        var idx = speakers.indexOf(speaker.value);

        // Is currently selected
        if (idx > -1) {
            speakers.splice(idx, 1);
        }

        // Is newly selected
        else {
            speakers.push(speaker.value);
            if (currentRegion.data.speakerName != ''){
                currentRegion.data.speakerName = speaker.name;
            }
        }

        this.historyService.addHistory(currentRegion);
        this.historyService.undoStack.push([currentRegion.id]);

        this.regionUpdated(currentRegion);

        this.eventBus.trigger('geckoChanged', {
            event: 'speakerChanged',
            data: speaker.value
        })

        this.setMergedRegions()
        this.eventBus.trigger('proofReadingSetSelected')
    }

    mergeSpeakerLabel(currentSpeaker, mergeToSpeaker) {

        this.filesData[this.selectedFileIndex].legend = this.filesData[this.selectedFileIndex].legend.filter(s => s.value != currentSpeaker.value);

        let changedRegions = [];

        this.iterateRegions(region => {
            let index = region.data.speaker.indexOf(currentSpeaker.value);
            if (index > -1) {
                region.data.speaker.splice(index);
                if (!region.data.speaker.includes(mergeToSpeaker)){
                    region.data.speaker.push(mergeToSpeaker.value);
                }
                this.historyService.addHistory(region);
                changedRegions.push(region.id);
                this.regionUpdated(region);
            }
        }, this.selectedFileIndex);

//        this.eventBus.trigger('geckoChanged', {
//            event: 'speakerLabelDeleted',
//            data: [this.selectedFileIndex, speaker, changedRegions]
//        })

        this.setMergedRegions()
        this.historyService.undoStack.push([constants.OPERATION_IDS.SPEAKER_LABEL_MERGED, this.selectedFileIndex, currentSpeaker, mergeToSpeaker, changedRegions]);
    }

    deleteSpeakerLabel(speaker) {

        this.filesData[this.selectedFileIndex].legend = this.filesData[this.selectedFileIndex].legend.filter(s => s.value != speaker.value);

        let changedRegions = [];

        this.iterateRegions(region => {
            let index = region.data.speaker.indexOf(speaker.value);
            if (index > -1) {
                region.data.speaker.splice(index);
                this.historyService.addHistory(region);
                changedRegions.push(region.id);
                this.regionUpdated(region);
            }
        }, this.selectedFileIndex);

//        this.eventBus.trigger('geckoChanged', {
//            event: 'speakerLabelDeleted',
//            data: [this.selectedFileIndex, speaker, changedRegions]
//        })

        this.setMergedRegions()
        this.historyService.undoStack.push([constants.OPERATION_IDS.SPEAKER_LABEL_DELETED, this.selectedFileIndex, speaker, changedRegions]);
    }

    speakerNameChanged(speaker, oldText, newText) {
        let self = this;

        // Check that there is no duplicate speaker.
        const found = self.filesData[self.selectedFileIndex].legend.find((s) => s.value === speaker.value && s !== speaker)
        if (found || !speaker.value.length) return false

        let rep = self.filesData[self.selectedFileIndex].reps[oldText];
        if (rep !== {}){
            self.filesData[self.selectedFileIndex].reps[newText] = rep;
            delete self.filesData[self.selectedFileIndex].reps[oldText];
        }

        self.updateLegend(self.selectedFileIndex);

        let changedRegions = [];
        self.iterateRegions(region => {
            let index = region.data.speaker.indexOf(oldText);

            if (index > -1) {
                region.data.speaker[index] = newText;
                this.historyService.addHistory(region);
                changedRegions.push(region.id);
            }
        }, self.selectedFileIndex);

        let fileAmount = self.filesData.length;
        var changeColor = []; // [] - no change, [{fileIndex, speaker, color, oldColor}] - change color of speakers
        if (fileAmount == 2){
            let index = self.selectedFileIndex == 0 ? 1 : 0;
            const found = self.filesData[index].legend.find((s) => s.value === speaker.value && s !== speaker)
            if (found){

                let sameColor = self.filesData[self.selectedFileIndex].legend.find((s) => s.color === found.color)
                if (sameColor){
                    changeColor.push({"fileIndex":self.selectedFileIndex, "speaker":sameColor.value, "color":speaker.color, "oldColor": sameColor.color})
                    self.filesData[self.selectedFileIndex].legend.find((s) => s.value === sameColor.value).color = speaker.color;
                    this.changeSpeakerColor(self.selectedFileIndex, sameColor.value, speaker.color, sameColor.color);
                }
                changeColor.push({"fileIndex":self.selectedFileIndex, "speaker":newText, "color":found.color, "oldColor": speaker.color})
                self.filesData[self.selectedFileIndex].legend.find((s) => s.value === found.value).color = found.color;
                this.changeSpeakerColor(self.selectedFileIndex, newText, found.color, speaker.color, false)
            }
        }

        this.eventBus.trigger('geckoChanged', {
            event: 'speakerNameChanged',
            data: [self.selectedFileIndex, oldText, newText, changedRegions]
        })

        this.setMergedRegions()

        // notify the undo mechanism to change the legend as well as the regions
        if (changeColor.length === 0)
            this.historyService.undoStack.push([constants.OPERATION_IDS.SPEAKER_NAME_CHANGED, self.selectedFileIndex, oldText, newText, changedRegions]);
       else
           this.historyService.undoStack.push([constants.OPERATION_IDS.SPEAKER_NAME_AND_COLOR_CHANGED, self.selectedFileIndex, oldText, newText, changedRegions, changeColor]);
    }

    updateLegend(fileIndex, oldSpeaker, newSpeaker) {
        let fileData = this.filesData[fileIndex]
        if (oldSpeaker && newSpeaker) {
            const found = fileData.legend.find(s => s.value === oldSpeaker)
            if (found) {
                found.value = newSpeaker
            }
        }
        fileData.legend = prepareLegend(fileData.legend)
    }

    newSpeakerKeyUp(e) {
        if (e.keyCode === 13) {
            this.addSpeaker();
        }
    }

    addSpeaker() {
        let legend = this.filesData[this.selectedFileIndex].legend

        if (this.newSpeakerName === '' || legend.find(s => s.value === this.newSpeakerName)) return

        const firstDefaultIndex = legend.findIndex(s => s.isDefault)
        const regularSpeakers = legend.slice(0, firstDefaultIndex)

        let activeColors = regularSpeakers.map(speaker => speaker.color);
        let chosenColor;
        for (let i = 0; i < constants.SPEAKER_COLORS.length; i++){
            if (!activeColors.includes(constants.SPEAKER_COLORS[i])){
                chosenColor = constants.SPEAKER_COLORS[i];
                break;
            }
        }

        legend.push({
            value: this.newSpeakerName,
            name: '',
            color: chosenColor
        })

        this.filesData[this.selectedFileIndex].legend = prepareLegend(legend)

        this.historyService.undoStack.push([constants.OPERATION_IDS.SPEAKER_LABEL_ADDED, this.selectedFileIndex, this.newSpeakerName]);

        this.newSpeakerName = ''



    }

// WARNING: Does not work well. after resize there's a dragging problem for regions
// resizeWavesurfer(e) {
//     var currentHeight = e.currentTarget.offsetHeight - 10;
//
//     if (this.previousHeight && currentHeight !== this.previousHeight) {
//         this.previousHeight = currentHeight;
//         this.wavesurfer.setHeight(currentHeight);
//     }
// }

    changeSpeakerColor(fileIndex, speaker, color, oldColor='', updateHistory=true) {
        var self = this;

//        self.filesData[fileIndex].legend[speaker] = color;
        self.filesData[fileIndex].legend.find((s) => s.value === speaker).color = color;

        this.iterateRegions((region) => {
            if (region.data.speaker.indexOf(speaker) > -1) {
                oldColor = oldColor == '' || oldColor == color ? region.color : oldColor;
                self.regionUpdated(region);
            }
        }, fileIndex);

        if (updateHistory && oldColor != ''){
            this.historyService.undoStack.push([constants.OPERATION_IDS.SPEAKER_COLORS_CHANGED, fileIndex, speaker, color, oldColor]);
        }


    }

    async loadDraft (draft) {
        this.init()
        if (this.dataBase) {
            const dbDraft = await this.dataBase.getDraft(draft)
            this.currentDraftId = dbDraft.id
            this.lastDraft = formatTime(new Date(dbDraft.mtime))

            this.loadFromDB(dbDraft)
        }
    }

    async loadServer (config) {
        var self = this;
        if (self.wavesurfer) self.wavesurfer.destroy();
        self.init()
        self.loader = true
        self.serverConfig = config
        this.dataManager.loadFileFromServer(config).then(async (res) => {
            parseServerResponse(this, config, res)

            if (config.enableDrafts && this.dataBase) {
                const serverDraft = await self.dataBase.createDraft({
                    mediaFile: {
                        name: audioFileName,
                        data: res.audioFile,
                        url: config.audio.url
                    },
                    files: self.filesData,
                    draftType: 1
                })
                self.currentDraftId = serverDraft
                self.lastDraft = formatTime(new Date())
            }
        })
    }

    async loadServerMode(config) {
        if (config.audio && config.audio.url) {
            const fileDrafts = this.dataBase ? await this.dataBase.checkDraftUrl(config.audio.url) : null
            if (fileDrafts && fileDrafts.length && config.enableDrafts) {
                Swal.fire({
                    title: 'Select draft',
                    text: "Looks like you has a draft for this file.",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33',
                    confirmButtonText: 'Select draft'
                  }).then(async (result) => {
                    if (result.value) {
                        if (this.dataBase) {
                            const drafts = await this.dataBase.getDrafts(1)
                            const modalInstance = this.$uibModal.open(loadDraftModal(this, drafts))
                            modalInstance.result.then(async (res) => {
                                if (res) {
                                    if (this.wavesurfer) this.wavesurfer.destroy();
                                    this.loadDraft(res)
                                } else {
                                    this.loadServer(config)
                                }
                            });
                        }
                    } else {
                        this.loadServer(config)
                    }
                  })
            } else {
                this.loadServer(config)
            }
        }
    }

    loadClientMode() {
        const modalInstance = this.$uibModal.open(loadingModal(this))

        modalInstance.result.then((res) => {
            if (res) {
                if (this.wavesurfer) this.wavesurfer.destroy();
                this.init();
                if (res.comparsion) {
                    this.comparsionMode = true
                }
                parseAndLoadAudio(this, res);
            }
        });
    }

    async loadFromDB (res) {
        const mediaFile = res.mediaFile
        const files = res.files
        
        if (files && files.length) {
            this.filesData = files.map((f) => {
                return {
                    filename: f.filename,
                    data: f.data
                }
            })
        } else {
            this.filesData = []
        }

        if (mediaFile) {
            this.audioFileName = mediaFile.name
            if (!mediaFile.isVideo) {
                this.wavesurfer.loadBlob(mediaFile.data)
            } else {
                const fileResult = await this.readVideoFile(mediaFile.data)
                this.videoPlayer = videojs('video-js')
                this.videoPlayer.ready(function () {
                    var fileUrl = URL.createObjectURL(mediaFile.data);
                    var fileType = mediaFile.data.type;
                    this.src({ type: fileType, src: fileUrl });
                    this.load();
                    this.muted(true)
                })
                this.wavesurfer.loadDecodedBuffer(fileResult)
            }
        }
    }

    handleTextFormats(filename, data) {
        return parseTextFormats(filename, data, this, config.parserOptions)
    }

    openShortcutsInfo() {
        this.$uibModal.open(shortcutsModal(this));
    }

    seek(time, leanTo) {
        let offset = 0;

        if (leanTo === 'right') {
            offset = 0.0001;
        } else if (leanTo === 'left') {
            offset = -0.0001;
        }

        this.wavesurfer.seekTo((time + offset) / this.wavesurfer.getDuration());
    }

    jumpNextWord () {
        
    }

    jumpPreviousWord () {
        
    }

    editableKeysMapping(regionIndex, wordIndex, keys, which) {
        const currentRegion = this.currentRegions[regionIndex];
        const words = currentRegion.data.words;

        if (keys === 'space') {
            this.playPause()
        } else if (keys === 'ArrowRight') {
            let nextIndex = wordIndex + 1;
            if (nextIndex < words.length) {
                const nextWord = document.getElementById(`word_${regionIndex}_${nextIndex}`);
                nextWord.focus();
                // this.seek(words[nextIndex].start, 'right');
            } else {
                var nextRegion = this.getRegion(currentRegion.next);
                if (nextRegion) {
                    this.seek(nextRegion.data.words[0].start, 'right');
                    this.$timeout(() => {
                        const nextWord = document.getElementById(`word_${regionIndex}_0`)
                        if (nextWord) {
                            nextWord.focus()
                        }
                    })
                }
            }
        } else if (keys === 'ArrowLeft') {
            let prevIndex = wordIndex - 1
            if (prevIndex >= 0) {
                const prevWord = document.getElementById(`word_${regionIndex}_${prevIndex}`)
                prevWord.focus()
                // this.seek(words[prevIndex].start, 'right');
            } else {
                var prevRegion = this.getRegion(currentRegion.prev);
                if (prevRegion) {
                    const lastIndex = prevRegion.data.words.length - 1;
                    this.seek(prevRegion.data.words[lastIndex].start, 'right');
                    this.$timeout(() => {
                        const prevWord = document.getElementById(`word_${regionIndex}_${lastIndex}`)
                        if (prevWord) {
                            prevWord.focus()
                        }
                    })
                }
            }
        } else if (keys === 'alt_space') {
            this.playRegion()
        } else if (which === 219) {
            this.wavesurfer.skip(-5)
        }
    }

    toggleSpectrogram() {
        if (!this.spectrogramReady) {
            this.wavesurfer.initPlugin('spectrogram')
            this.spectrogramReady = true
        }
        this.showSpectrogram = !this.showSpectrogram
    }

    searchBarUpdate(time=200) {
        return; // not working right..
        let i = this.proofReadingView ? 1 : 0;
        let searchBar = document.getElementsByClassName("search-bar")[i].getElementsByClassName("SearchBarInput")[0].value = this.searchBarText;
        if (this.searchBarView){
            setTimeout(() => {
                let searchBarRefresh = document.getElementsByClassName("search-bar")[i].getElementsByClassName("search-refresh")[0];
                angular.element(searchBarRefresh).click();
            }, time);
        }
    }

    toggleProofReadingView() {
        this.proofReadingView = !this.proofReadingView

        this.searchBarUpdate()

        if (!this.proofReadingView) {
            for (let i = 0; i < this.filesData.length; i++) {
                this.resetEditableWords(`main_${i}`)
            }
            if (!this.isPlaying) {
                this.$timeout(() => {
                    this.wavesurfer.seekAndCenter(this.wavesurfer.getCurrentTime() / this.wavesurfer.getDuration())
                })
            }

            this.userConfig.showWaveform = true
            this.userConfig.showSegmentLabeling = true
            this.userConfig.showTranscriptDifferences = true
        } else {
            // this.setMergedRegions()
            this.eventBus.trigger('proofReadingScrollToSelected')

            this.$timeout(() => {
                this.updateSelectedWordInFiles()
            })

            this.userConfig.showWaveform = false
            this.userConfig.showSegmentLabeling = false
            this.userConfig.showTranscriptDifferences = false
        }

        this.calculatePanelsWidth()
    }

    updateZoomTooltip (newVal) {
        if (newVal) {
            this.zoomTooltip.update()
        }
    }

    setContextMenuRegion (region) {
        if (!region) {
            this.contextMenuRegion = null
            return
        }

        this.contextMenuNextRegion = null
        this.contextMenuPrevRegion = null
        this.contextMenuRegion = region
    }

    setContextMenuRegions (eventX) {
        this.contextMenuPrevRegion = null
        this.contextMenuNextRegion = null

        const wavesurferWidth = this.wavesurfer.drawer.width
        const duration = this.wavesurfer.getDuration()
        const perc = (eventX / wavesurferWidth)
        const time = perc * duration

        this.iterateRegions((r) => {
            if (r.data.isDummy) {
                return
            }
            const next = this.getRegion(r.next)
            if (!r.prev && time < r.start) {
                this.contextMenuNextRegion = r
            } else if (!r.next && time > r.end) {
                this.contextMenuPrevRegion = r
            } else if (next && r.end < time && next.start > time) {
                this.contextMenuNextRegion = next
                this.contextMenuPrevRegion = r
            }
        }, this.contextMenuFileIndex)
    }

    fillRegion (speaker, event) {
        if (this.contextMenuNextRegion || this.contextMenuPrevRegion) {
            const start = this.contextMenuPrevRegion ? this.contextMenuPrevRegion.end : 0
            const end = this.contextMenuNextRegion ? this.contextMenuNextRegion.start : this.wavesurfer.getDuration()
            const length = end - start
            if (length < constants.MINIMUM_LENGTH) {
                if (event) {
                    event.preventDefault()
                }
                this.toaster.pop('warning', 'The segment you\'re trying to create is too small')
                return
            }
            const newRegion = this.wavesurfer.addRegion({
                start,
                end,
                data: {
                    initFinished: true,
                    fileIndex: this.contextMenuFileIndex,
                    speaker: [speaker.value],
                    words: [{start, end, text: '', uuid: uuidv4()}]
                },
                drag: false,
                minLength: constants.MINIMUM_LENGTH
            })
            this.historyService.undoStack.push([newRegion.id])
            this.contextMenuRegion = newRegion
        }
    }

    contextMenuSpeakerClicked (speaker, event) {
        this.speakerChanged(speaker, true, event)
        event.stopPropagation()
    }

    calculatePanelsWidth (initial = false) {
        if (initial) {
            this.filesData.forEach(fd => {
                if (this.userConfig.showTranscriptFiles[fd.filename] !== false && this.userConfig.showTranscriptFiles[fd.filename] !== true) {
                    this.userConfig.showTranscriptFiles[fd.filename] = true
                }
            })
        }   

        const { showSegmentLabeling, showTranscriptDifferences, showTranscriptFiles } = this.userConfig
        const showDifferencesPanel = this.discrepancies && showTranscriptDifferences
        const shownPanels = this.filesData.filter(fd => showTranscriptFiles[fd.filename])
        if (showSegmentLabeling && showDifferencesPanel) {
            this.transcriptPanelSize = parseInt(6 / shownPanels.length)
        } else if (showSegmentLabeling || showDifferencesPanel) {
            this.transcriptPanelSize = parseInt(9 / shownPanels.length)
        } else {
            this.transcriptPanelSize = parseInt(12 / shownPanels.length)
        }     
    }

    toggleTextPanel (filename) {
        this.userConfig.showTranscriptFiles[filename] = !this.userConfig.showTranscriptFiles[filename]
        for (let i = 0; i < this.filesData.length; i++) {
            this.$timeout(() => this.resetEditableWords(this.getCurrentRegion(i)))
        }
        this.calculatePanelsWidth()
        this.saveUserSettings()
    }

    toggleSegmentLabeling () {
        this.userConfig.showSegmentLabeling = !this.userConfig.showSegmentLabeling
        this.calculatePanelsWidth()
        this.saveUserSettings()
    }

    toggleTranscriptDifferences () {
        this.userConfig.showTranscriptDifferences = !this.userConfig.showTranscriptDifferences
        this.calculatePanelsWidth()
        this.saveUserSettings()
    }

    toggleWaveform () {
        this.userConfig.showWaveform = !this.userConfig.showWaveform
        if (this.userConfig.showWaveform) {
            if (!this.isPlaying) {
                this.$timeout(() => {
                    this.wavesurfer.seekAndCenter(this.wavesurfer.getCurrentTime() / this.wavesurfer.getDuration())
                })
            }
        }
        this.saveUserSettings()
    }

    saveUserSettings () {
        const serializedSettings = JSON.stringify(this.userConfig)
        window.localStorage.setItem('geckoUserConfig', serializedSettings)
    }

    toggleVideo () {
        this.userConfig.showVideo = !this.userConfig.showVideo
        this.saveUserSettings()
    }
    
}

MainController
    .$inject = ['$scope', '$uibModal', 'toaster', 'dataManager', 'dataBase', 'eventBus', 'historyService', 'debounce', '$timeout', '$interval', '$sce', 'store'];
export {
    MainController
}