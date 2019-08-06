import initWaveSurfer from './wavesurfer.js'

import * as constants from './constants'

import './third-party/soundtouch.js'

import {config} from './config.js'

var Diff = require('diff')

const audioModalTemplate = require('ngtemplate-loader?requireAngular!html-loader!../static/templates/selectAudioModal.html')
const shortcutsInfoTemplate = require('ngtemplate-loader?requireAngular!html-loader!../static/templates/shortcutsInfo.html')

window.onbeforeunload = function (event) {
    return confirm("Confirm refresh");
};

function sortDict(dict, sortBy, sortFunction) {
    var sorted = {};

    if (sortBy !== undefined) {
        sortFunction = function (a, b) {
            return (dict[a][sortBy] < dict[b][sortBy]) ? -1 : ((dict[a][sortBy] > dict[b][sortBy]) ? 1 : 0)
        };
    }

    // sort by keys if sortFunction is undefined
    Object.keys(dict).sort(sortFunction).forEach(function (key) {
        sorted[key] = dict[key];
    });

    return sorted;
}

function jsonStringify(json){
    return JSON.stringify(json, function(key, value) {
        // limit precision of floats
        if (typeof value === 'number') {
            return parseFloat(value.toFixed(2));
        }
        return value;
    })
}

// First, checks if it isn't implemented yet.
if (!String.prototype.format) {
    String.prototype.format = function () {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function (match, number) {
            return typeof args[number] != 'undefined'
                ? args[number]
                : match
                ;
        });
    };
}

function str_pad_left(string, pad, length) {
    return (new Array(length + 1).join(pad) + string).slice(-length);
}

function secondsToMinutes(time) {
    var nstring = (time.toFixed(3) + ""),
        nindex = nstring.indexOf("."),
        floatPart = (nindex > -1 ? nstring.substring(nindex + 1) : "000");
    return str_pad_left(Math.floor(time / 60), '0', 2) + ':' + str_pad_left(Math.floor(time % 60), '0', 2) + "." + floatPart;
}

class MainController {
    constructor($scope, $uibModal, dataManager, $timeout) {
        this.dataManager = dataManager;
        this.$uibModal = $uibModal;
        this.$scope = $scope;
        this.$timeout = $timeout
    }

    loadApp(config) {
        if (config.mode === 'server') {
            this.loadServerMode(config);
        } else {
            this.loadClientMode();
        }
    }

    init($scope) {
        this.currentTime = "00:00";
        // this.currentTimeSeconds = 0;
        this.zoomLevel = constants.ZOOM;
        this.isPlaying = false;
        this.playbackSpeeds = constants.PLAYBACK_SPEED;
        this.currentPlaybackSpeed = 1;

        this.undoStack = [];
        this.regionsHistory = {};
        this.updateOtherRegions = new Set();

        this.isRegionClicked = false;
        this.isTextChanged = false;

        this.wavesurfer = initWaveSurfer();
        this.wavesurferElement = this.wavesurfer.drawer.container;

        this.ctmData = [];
        this.ready = false;

        var self = this;

        document.onkeydown = function (e) {
            if (e.key === 'Escape') {
                if (document.activeElement) {
                    document.activeElement.blur();
                }
                return;
            }

            const isMacMeta = window.navigator.platform === 'MacIntel' && e.metaKey
            const isOtherControl =  window.navigator.platform !== 'MacIntel' && e.ctrlKey
            const isDownCtrl = isMacMeta || isOtherControl

            // wavesurfer does not get focus for some reason, so body it is
            // if (e.target.nodeName !== 'BODY') return;
            if (e.target.type === 'text') return;

            if (e.key === " ") {
                e.preventDefault();
                self.playPause();
            } else if (e.key === "Delete" || e.key === "Backspace") {
                self.deleteRegionAction(self.selectedRegion);
            } else if (e.key === 'ArrowRight' && e.ctrlKey) {
                self.jumpNextDiscrepancy();
            } else if (e.key === "ArrowLeft") {
                self.wavesurfer.skip(-1);
            } else if (e.key === "ArrowRight") {
                self.wavesurfer.skip(1);
            } else if (e.key === "z" && e.ctrlKey) {
                self.undo();
            } else if (e.key === 'Enter') {
                self.playRegion();
            } else if (isDownCtrl) {
                if (e.which === 219) {
                    e.preventDefault()
                    self.moveBack()
                }
            } else {
                let number = parseInt(e.key);
                if (!isNaN(number) && number >= 1 && number <= 9) {
                    let index = number - 1;
                    if (self.selectedRegion) {
                        let fileIndex = self.selectedRegion.data.fileIndex;
                        let speakers = Object.keys(self.filesData[fileIndex].legend);
                        if (index < speakers.length) {
                            self.speakerChanged(speakers[index]);
                        }
                    }
                }
            }

            $scope.$evalAsync();

        };

        this.wavesurferElement.onclick = function (e) {
            if (!self.isRegionClicked) {
                self.calcCurrentFileIndex(e);
                // self.deselectRegion();
            }

            self.isRegionClicked = false;

            // $scope.$evalAsync();
        };

        this.wavesurfer.on('audioprocess', function (e) {
            self.updateView();
        });


        // this.wavesurfer.on('zoom', function (e) {
        //     console.log('zoom changed');
        //     self.draw();
        // });

        this.wavesurfer.on('error', function (e) {
            alert('wavesurfer error');
            console.error("wavesurfer error:");
            console.log(e);
        });

        this.wavesurfer.on('loading', function () {
            $scope.$evalAsync(function () {
                self.loader = true;
            });
        });

        this.wavesurfer.on('ready', function (e) {
            self.previousHeight = parseInt(self.wavesurfer.getHeight());
            self.totalTime = secondsToMinutes(self.wavesurfer.getDuration());
            self.wavesurfer.enableDragSelection(
                {
                    drag: false,
                    minLength: constants.MINIMUM_LENGTH
                });

            $scope.$watch(() => self.zoomLevel, function (newVal) {
                if (newVal) {
                    self.wavesurfer.zoom(self.zoomLevel);
                }
            });

            self.createSpeakerLegends();

            self.addRegions();


            // // map between speakers according to EDER mapping
            // if (self.EDER) {
            //     var mapping = self.EDER.map;
            //     for (let s in self.speakersColors) {
            //         var mapped = mapping[s];
            //         if (mapped) {
            //             self.speakersColors[mapped] = self.speakersColors[s];
            //         }
            //     }
            // }

            // select the first region
            self.selectedFileIndex = 0;
            self.selectRegion();

            // var interval = setInterval(function () {
            //     self.iterateRegions(function (region) {
            //         if (region.end <= region.start) {
            //             alert("STOP! CALL GOLAN.");
            //             console.log("start: {0} End: {1}".format(region.start, region.end));
            //             console.log(region);
            //             clearInterval(interval);
            //             throw "ERROR";
            //         }
            //     });
            // }, 100)


            self.handleCtm();

            var st = new soundtouch.SoundTouch(self.wavesurfer.backend.ac.sampleRate);
            var buffer = self.wavesurfer.backend.buffer;
            var channels = buffer.numberOfChannels;
            var l = buffer.getChannelData(0);
            var r = channels > 1 ? buffer.getChannelData(1) : l;
            self.length = buffer.length;
            self.seekingPos = null;
            var seekingDiff = 0;

            var source = {
                extract: function (target, numFrames, position) {
                    if (self.seekingPos != null) {
                        seekingDiff = self.seekingPos - position;
                        self.seekingPos = null;
                    }

                    position += seekingDiff;

                    for (var i = 0; i < numFrames; i++) {
                        target[i * 2] = l[i + position];
                        target[i * 2 + 1] = r[i + position];
                    }

                    return Math.min(numFrames, self.length - position);
                }
            }


            self.soundtouchNode = null;

            self.wavesurfer.on('play', function () {
                self.seekingPos = ~~(self.wavesurfer.backend.getPlayedPercents() * self.length);
                st.tempo = self.wavesurfer.getPlaybackRate();

                if (st.tempo === 1) {
                    self.wavesurfer.backend.disconnectFilters();
                } else {
                    if (!self.soundtouchNode) {
                        var filter = new soundtouch.SimpleFilter(source, st);
                        self.soundtouchNode = soundtouch.getWebAudioNode(self.wavesurfer.backend.ac, filter);
                    }
                    self.wavesurfer.backend.setFilter(self.soundtouchNode);
                }

                self.isPlaying = true;
                $scope.$evalAsync();
            });

            self.wavesurfer.on('pause', function () {
                self.soundtouchNode && self.soundtouchNode.disconnect();
                self.isPlaying = false;
                $scope.$evalAsync();
            });


            self.loader = false;
            self.ready = true;

            $scope.$evalAsync();

        });

        this.wavesurfer.on('seek', function (e) {
            self.updateView();

            $scope.$evalAsync();
        });

        this.wavesurfer.on("region-created", function (region) {
            var numOfFiles = self.filesData.length;

            // indication when file was created by drag
            if (region.data.fileIndex === undefined) {
                // to notify "region-update" for the first update
                // (to get the start value which for some reason we gon't get on "region-created")

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
        });

        this.wavesurfer.on("region-updated", function (region) {
            self.regionPositionUpdated(region);

        });

        this.wavesurfer.on('region-update-end', function (region) {
            self.regionPositionUpdated(region);

            var multiEffect = [region.id];
            self.addHistory(region);

            for (let r of self.updateOtherRegions) {
                self.addHistory(r);
                multiEffect.push(r.id);
            }

            self.updateOtherRegions.clear()
            self.undoStack.push(multiEffect);

            $scope.$evalAsync();
        });

        // this.wavesurfer.on('region-in', function (region) {
        //     if (region.data.fileIndex === self.selectedFileIndex) {
        //         self.selectRegion(region);
        //     }
        //
        //     self.currentRegions[region.data.fileIndex] = region;
        // });

        // this.wavesurfer.on('region-out', function (region) {
        //     if (region.data.fileIndex === self.selectedFileIndex) {
        //         self.deselectRegion(region)
        //     }
        //
        //     self.currentRegions[region.data.fileIndex] = undefined;
        // });

        this.wavesurfer.on('region-click', function (region) {
            self.isRegionClicked = true;
            self.selectedFileIndex = region.data.fileIndex;

            // self.selectRegion(region);
            //self.updateView();
        });

    }

    // for debugging
    _printRegionsInfo(fileIndex) {
        var self = this;

        var formatted = {};
        this.iterateRegions(function (region) {
            var r = self.copyRegion(region);
            r.fileIndex = r.data.fileIndex;
            r.speaker = r.data.speaker.join(constants.SPEAKERS_SEPARATOR);
            r.initFinished = r.data.initFinished;
            delete r.data;
            delete r.drag;
            delete r.minLength;
            var id = r.id;
            delete r.id;
            formatted[id] = r;
        }, fileIndex, true);

        console.table(formatted);
    }

    _printHistoryInfo(onlyAvailableHistory) {
        var self = this;

        Object.keys(this.regionsHistory).forEach(function (key) {
            var history = self.regionsHistory[key];
            var formatted = [];

            if (onlyAvailableHistory && history.length < 2) {
                return;
            }

            for (let i = 0; i < history.length; i++) {
                var region = history[i];
                if (region) {
                    var r = self.copyRegion(region);
                    r.fileIndex = r.data.fileIndex;
                    r.speaker = r.data.speaker.join(constants.SPEAKERS_SEPARATOR);
                    r.initFinished = r.data.initFinished;
                    delete r.data;
                    delete r.drag;
                    delete r.minLength;

                    formatted.push(r);
                } else {
                    formatted.push(region);
                }
            }

            console.log(key);
            console.table(formatted);
        });
    }


    handleCtm() {
        if (this.ctmData.length !== 2) return;

        let diff = Diff.diffArrays(this.ctmData[0], this.ctmData[1], {
            comparator: function (x, y) {
                return x.text === y.text;
            }
        });
        this.discrepancies = [];
        this.wavesurfer.params.autoCenter = true;

        function handleDiscrepancy(discrepancy, diffItem) {
            if (diffItem.removed) {
                if (discrepancy.old) {
                    throw "Does not suppose to happen";
                }
                discrepancy.old = diffItem.value;
            } else {
                if (discrepancy.new) {
                    throw "Does not suppose to happen";
                }
                discrepancy.new = diffItem.value;
            }
        }

        for (let i = 0; i < diff.length; i++) {
            if (diff[i].removed || diff[i].added) {
                let discrepancy = {};
                handleDiscrepancy(discrepancy, diff[i])

                i++;

                //check for the other side of the discrepancy
                if (i < diff.length && (diff[i].removed || diff[i].added)) {
                    handleDiscrepancy(discrepancy, diff[i])
                }

                this.discrepancies.push(discrepancy);
            }
        }

        this.discrepancies.forEach(function (discrepancy) {
            let oldStart = Infinity;
            let oldEnd = 0;

            if (discrepancy.old) {
                discrepancy.oldText = discrepancy.old.map(x => x.text).join(" ");
                oldStart = discrepancy.old[0].start;
                oldEnd = discrepancy.old[discrepancy.old.length - 1].end;
            }

            let newStart = Infinity;
            let newEnd = 0;

            if (discrepancy.new) {
                discrepancy.newText = discrepancy.new.map(x => x.text).join(" ");
                newStart = discrepancy.new[0].start;
                oldEnd = discrepancy.new[discrepancy.new.length - 1].end;
            }

            if (newStart > oldStart) {
                discrepancy.start = oldStart;
            } else {
                discrepancy.start = newStart;
            }

            if (newEnd > oldEnd) {
                discrepancy.end = newEnd;
            } else {
                discrepancy.end = oldEnd;
            }

            discrepancy.startDisp = secondsToMinutes(discrepancy.start);
            discrepancy.endDisp = secondsToMinutes(discrepancy.end);
        });
    }

    fixRegionsOrder(region) {
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

    addHistory(region) {
        if (!this.regionsHistory[region.id]) {
            this.regionsHistory[region.id] = [];
        }

        this.regionsHistory[region.id].push(this.copyRegion(region));
    }

    regionPositionUpdated(region) {
        var self = this;

        self.selectRegion(region);

        if (!region.data.initFinished) {
            region.data.initFinished = true;
            this.fixRegionsOrder(region);
        }

        var prevRegion = this.getRegion(region.prev);
        var nextRegion = this.getRegion(region.next);

        if (prevRegion !== null) {
            if (region.start < prevRegion.start + constants.MINIMUM_LENGTH) {
                region.start = prevRegion.start + constants.MINIMUM_LENGTH;
                region.end = Math.max(region.start + constants.MINIMUM_LENGTH, region.end);
            } else if (region.start < prevRegion.end) {
                prevRegion.end = region.start;
                self.updateOtherRegions.add(prevRegion);
                self.regionUpdated(prevRegion);
            }
        }

        if (nextRegion !== null) {
            if (region.end > nextRegion.end - constants.MINIMUM_LENGTH) {
                region.end = nextRegion.end - constants.MINIMUM_LENGTH;
                region.start = Math.min(region.start, region.end - constants.MINIMUM_LENGTH);
            } else if (region.end > nextRegion.start) {
                nextRegion.start = region.end;
                self.updateOtherRegions.add(nextRegion);
                self.regionUpdated(nextRegion);
            }
        }

        self.regionUpdated(region);
    }

    // change region visually
    regionUpdated(region) {
        // if (region.data.speaker !== 'EDER') {

        region.element.style.background = "";

        if (region.data.speaker.length === 0) {
            region.color = constants.UNKNOWN_SPEAKER_COLOR;
        } else if (region.data.speaker.length === 1) {
            region.color = this.filesData[region.data.fileIndex].legend[region.data.speaker[0]];

        } else {
            let line_width = 20;

            let colors = region.data.speaker.map((s, i) =>
                "{0} {1}px".format(this.filesData[region.data.fileIndex].legend[s], (i + 1) * line_width)).join(',');

            region.element.style.background =
                "repeating-linear-gradient(135deg, {0})".format(colors);

        }

        if (region.data.words) {
            region.data.words.forEach((w) => {
                if (region.data.speaker.length === 0) {
                    w.speaker.id = null
                } else {
                    if (w.speaker.id !== region.data.speaker[0]) {
                        w.speaker.id = region.data.speaker[0]
                    }
                }
            })
        }
        // }

        //TODO: This also happens at other times so we cannot determine things after it
        // unless we fork the repo and set an "afterrender" event so we could change the region however we'd like
        region.updateRender();

        // region.element.title = region.data.speaker;

        this.$scope.$evalAsync();
    }

    copyRegion(region) {

        //TODO: change the copy of data to deep copy by "JSON.parse(JSON.stringify(object))"
        // and then handle "words" correctly
        return {
            id: region.id,
            data: {
                initFinished: region.data.initFinished,
                text: region.data.text,
                fileIndex: region.data.fileIndex,
                speaker: region.data.speaker.slice() // copy by value
            },
            start: region.start,
            end: region.end,
            drag: region.drag,
            minLength: constants.MINIMUM_LENGTH
        }
    }


    undo() {
        if (!this.undoStack.length) {
            return;
        }

        var regionIds = this.undoStack.pop();

        for (let regionId of regionIds) {

            var history = this.regionsHistory[regionId];

            var lastState = history.pop();

            if (lastState === null) {
                // pop again because "region-created" will insert another to history
                var newRegion = this.wavesurfer.addRegion(history.pop());
                this.regionPositionUpdated(newRegion);
            } else if (history.length === 0) {
                this.__deleteRegion(this.getRegion(regionId));
            } else {
                this.wavesurfer.regions.list[regionId].update(this.copyRegion(history[history.length - 1]));
            }
        }

        this.$scope.$evalAsync();
    }

    updateView() {
        this.selectRegion();
        this.silence = this.calcSilenceRegion();
        this.setCurrentTime();
        this.calcCurrentRegions();
        this.updateSelectedWordInFiles();
        this.updateSelectedDiscrepancy();
    }

    calcCurrentFileIndex(e) {
        var scrollBarHeight = 20;
        var wavesurferHeight = this.wavesurfer.getHeight() - scrollBarHeight;

        // vertical click location
        var posY = e.pageY - e.target.offsetTop;

        this.selectedFileIndex = parseInt(posY / wavesurferHeight * this.filesData.length);
    }

    deselectRegion(region) {
        if (region !== undefined) {
            region.element.classList.remove("selected-region");
            if (this.selectedRegion === region) {
                this.selectedRegion = undefined;
            }
        } else if (this.selectedRegion) {
            if (this.selectedRegion.element) {
                this.selectedRegion.element.classList.remove("selected-region");
            }
            this.selectedRegion = undefined;
        }
    }

    calcCurrentRegions() {
        for (let i = 0; i < this.filesData.length; i++) {
            this.currentRegions[i] = this.getCurrentRegion(i);
        }
    }

    getCurrentRegion(fileIndex) {
        let region;

        var time = this.wavesurfer.getCurrentTime();
        this.iterateRegions(function (r) {
            if (time >= r.start && time <= r.end) {
                region = r;
            }
        }, fileIndex);

        return region;
    }

    selectRegion(region) {
        this.deselectRegion();

        if (!region) {
            region = this.getCurrentRegion(this.selectedFileIndex);
        }

        if (!region) return;

        region.element.classList.add("selected-region");

        this.selectedRegion = region;
    }

    jumpNextDiscrepancy() {
        let time = this.wavesurfer.getCurrentTime();

        let i = 0;
        for (; i < this.filteredDiscrepancies.length; i++) {
            if (this.filteredDiscrepancies[i].start > time + constants.EXTRA_DISCREPANCY_TIME) {
                break;
            }
        }

        if (this.filteredDiscrepancies[i]) {
            this.playDiscrepancy(this.filteredDiscrepancies[i]);
        }
    }

    playDiscrepancy(discrepancy) {
        this.wavesurfer.play(discrepancy.start - constants.EXTRA_DISCREPANCY_TIME,
            discrepancy.end + constants.EXTRA_DISCREPANCY_TIME);
    }

    updateSelectedDiscrepancy() {
        var self = this;

        if (!self.discrepancies) return;
        let time = self.wavesurfer.getCurrentTime();

        let oldSelectedDiscrepancy = document.getElementsByClassName('selected-discrepancy')[0];
        if (oldSelectedDiscrepancy) {
            oldSelectedDiscrepancy.classList.remove('selected-discrepancy');
        }

        let i = 0;
        for (; i < self.filteredDiscrepancies.length; i++) {
            if (this.filteredDiscrepancies[i].start - constants.EXTRA_DISCREPANCY_TIME > time) {
                break;
            }
        }

        i--;

        if (i >= 0 && this.filteredDiscrepancies[i].end + constants.EXTRA_DISCREPANCY_TIME > time) {
            let newSelectedDiscrepancy = document.getElementById('discrepancy_' + (i).toString());
            if (newSelectedDiscrepancy) {
                newSelectedDiscrepancy.classList.add('selected-discrepancy');
                // newSelectedDiscrepancy.scrollIntoView();
            }
        }
    }

    updateSelectedWordInFile(fileIndex) {
        var self = this;

        let time = self.wavesurfer.getCurrentTime();

        let region = self.currentRegions[fileIndex];
        let newWordSpeakerElement = document.getElementById('speaker_{0}'.format(fileIndex));
        if (!region) {
            if (newWordSpeakerElement) {
                newWordSpeakerElement.textContent = ''
            }
            return
        }; 

        let words = region.data.words;
        if (!words) {
            if (newWordSpeakerElement) {
                newWordSpeakerElement.textContent = ''
            }
            return
        }; 

        let i = 0;

        for (; i < words.length; i++) {
            if (words[i].start > time) {
                break;
            }
        }
        i--;

        let newSelectedWord =
            document.getElementById('word_{0}_{1}'.format(fileIndex, (i).toString()));

        let newWordSpeaker = words[i].speaker
        
        if (newWordSpeakerElement && newWordSpeaker) {
            if (newWordSpeakerElement.textContent !== newWordSpeaker.id) {
                newWordSpeakerElement.textContent = newWordSpeaker.id
            }
        } else if (newWordSpeakerElement) {
            newWordSpeakerElement.textContent = ''
        }

        if (newSelectedWord) {
            newSelectedWord.classList.add('selected-word');
        }
    }

    updateSelectedWordInFiles() {
        // unselect words
        document.querySelectorAll('.selected-word').forEach(function (elem) {
            elem.classList.remove('selected-word');
        });

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

        if (sort) {
            regions = sortDict(regions, 'start');
        }

        Object.keys(regions).forEach(function (key) {
            var region = regions[key];
            if (fileIndex !== undefined && region.data.fileIndex !== fileIndex) {
                return;
            }
            // if (speaker !== undefined && region.data.speaker !== speaker) {
            //     return;
            // }

            func(region);
        });
    }

// Assuming time is not contained in any region
    findClosestRegionToTime(fileIndex, time, before) {
        var closest = null;
        this.iterateRegions(function (region) {
            if (before) {
                if (region.start < time - 0.01 && (closest === null || region.start > closest.start)) {
                    closest = region;
                }
            } else {
                if (region.end > time && (closest === null || region.end < closest.end)) {
                    closest = region;
                }
            }

        }, fileIndex);

        return closest;
    }

    findClosestRegionToTimeBackward(fileIndex, time) {
        var closest = null;
        this.iterateRegions(function (region) {
                if (region.end < time && (closest === null || region.end > closest.end)) {
                    closest = region;
                }
        }, fileIndex);

        return closest;
    }

    createSpeakerLegends() {
        var self = this;

        // First aggregate all speakers, overwrite if "color" field is presented anywhere.
        // We set the same speaker for different files with the same color this way,
        // // determined by the last "color" field or one of the colors in the list
        let speakersColors = Object.assign({}, constants.defaultSpeakers);

        self.filesData.forEach(fileData => {
            let colorIndex = 0;

            fileData.legend = Object.assign({}, constants.defaultSpeakers);

            fileData.data.forEach(monologue => {
                if (!monologue.speaker.id) return;

                let speakerId = monologue.speaker.id;

                let speakers = String(speakerId).split(constants.SPEAKERS_SEPARATOR);

                // TODO: remove and put colors as metadata outside monologues
                if (speakers.length === 1) {
                    // forcefully set the color of the speaker
                    if (monologue.speaker.color) {
                        speakersColors[speakerId] = monologue.speaker.color;
                    }
                }

                speakers.forEach(s => {

                    // Encounter the speaker id for the first time (among all files)
                    if (!(s in speakersColors)) {
                        speakersColors[s] = constants.SPEAKER_COLORS[colorIndex];
                        colorIndex = (colorIndex + 1) % constants.SPEAKER_COLORS.length;
                    }
                    fileData.legend[s] = undefined;
                });
            })

            fileData.legend = self.sortLegend(fileData.legend);
        });

        // Set the actual colors for each speaker
        self.filesData.forEach(fileData => {
            Object.keys(fileData.legend).forEach(speaker => {
                fileData.legend[speaker] = speakersColors[speaker];
            });
        });
    }

    addRegions() {
        var self = this;

        self.currentRegions = [];

        self.filesData.forEach((fileData, fileIndex) => {
            let monologues = fileData.data;

            if (!monologues.length) return;

            var last_end = monologues[0].start;

            for (var i = 0; i < monologues.length; i++) {
                var monologue = monologues[i];
                var speakerId = monologue.speaker.id.toString();

                var start = monologue.start;
                var end = monologue.end;


                // check overlapping with accuracy up to 5 decimal points
                // else if (last_end > start + 0.00001) {
                if (last_end > start + 0.00001) {
                    console.error("overlapping monologues. file index: {0} time: {1}".format(fileIndex, last_end.toFixed(2)));
                }

                last_end = end;

                //region.element.innerText = speaker;
                var region = this.wavesurfer.addRegion({
                    start: start,
                    end: end,
                    data: {
                        initFinished: true,
                        text: monologue.text,
                        fileIndex: fileIndex,
                        speaker: speakerId.split(constants.SPEAKERS_SEPARATOR),
                        words: monologue.words
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

    }

    deleteRegionAction(region) {
        if (!region) return;

        this.undoStack.push([region.id]);
        this.regionsHistory[region.id].push(null);

        this.__deleteRegion(region);
    }

    __deleteRegion(region) {
        if (!region) return;

        var prev = this.getRegion(region.prev);
        if (prev) prev.next = region.next;

        var next = this.getRegion(region.next);
        if (next) next.prev = region.prev;

        this.deselectRegion();
        region.remove();
        this.silence = this.calcSilenceRegion();
    }


    setPlaybackSpeed(speed) {
        this.currentPlaybackSpeed = speed;
        this.wavesurfer.setPlaybackRate(speed);
    }

    playPause() {
        this.isPlaying ? this.wavesurfer.pause() : this.wavesurfer.play();
    }

    playRegion() {
        if (this.selectedRegion) {
            this.selectedRegion.play();
        }
        // play silence region
        else {
            var silence = this.calcSilenceRegion();
            this.wavesurfer.play(silence.start, silence.end);
        }
    }

    calcSilenceRegion() {
        var silence = {start: 0, end: null};
        var afterRegion = this.findClosestRegionToTime(this.selectedFileIndex, this.wavesurfer.getCurrentTime());
        var beforeRegion = this.findClosestRegionToTime(this.selectedFileIndex, this.wavesurfer.getCurrentTime(), true);

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


    setCurrentTime() {
        // this.currentTimeSeconds = time;
        this.currentTime = secondsToMinutes(this.wavesurfer.getCurrentTime());
        this.$scope.$apply();
    }


    save(extension, converter) {
        for (var i = 0; i < this.filesData.length; i++) {
            var current = this.filesData[i];
            if (current.data) {
                // convert the filename to "rttm" extension
                var filename = current.filename.substr(0, current.filename.lastIndexOf('.')) + "." + extension;

                if (!this.checkValidRegions(i)) return;

                this.dataManager.downloadFileToClient(converter(i), filename);
            }
        }
    }

    saveDiscrepancyResults() {
        this.dataManager.downloadFileToClient(jsonStringify(this.discrepancies),
            this.filesData[0].filename + "_VS_" + this.filesData[1].filename + ".json");
    }

    saveRttm() {
        this.save('rttm', this.convertRegionsToRTTM.bind(this));
    }

    saveJson() {
        this.save('json', this.convertRegionsToJson.bind(this));
    }

    saveCtm() {
        this.save('ctm', this.convertRegionsToCtm.bind(this));
    }

    checkValidRegions(fileIndex) {
        var self = this;
        try {
            var last_end = 0;
            this.iterateRegions(function (region) {
                if (region.end <= region.start) {
                    throw "Negative duration in file {}\n Start: {1}\n End: {2}"
                        .format(self.filesData[fileIndex].filename, region.start, region.end);
                }

                if (last_end > region.start + 0.00001) {
                    throw "Overlapping in file: {0}. \n Time: {1}".format(self.filesData[fileIndex].filename, last_end.toFixed(2));
                }
                last_end = region.end;
            }, fileIndex, true)
        } catch (err) {
            alert(err);
            return false;
        }
        return true;
    }

    formatSpeaker(speaker) {
        var ret = "";

        if (speaker.length === 0) {
            ret = constants.UNKNOWN_SPEAKER;
        } else {
            ret = speaker.join(constants.SPEAKERS_SEPARATOR);
        }

        return ret;
    }

    convertRegionsToJson(fileIndex) {
        var self = this;
        var data = {schemaVersion: "2.0", monologues: []};
        this.iterateRegions(function (region) {

            data.monologues.push({
                speaker: {id: self.formatSpeaker(region.data.speaker), color: region.color},
                start: region.start,
                end: region.end,
                text: region.data.text
            });

        }, fileIndex, true);

        return jsonStringify(data);
    }

    convertRegionsToCtm(fileIndex) {
        const speakersMap = {}
        this.iterateRegions(function (region) {
            region.data.words.forEach((word) => {
                if (!speakersMap[word.speaker.id]) {
                    speakersMap[word.speaker.id] = []
                }
                speakersMap[word.speaker.id].push({
                    confidence: word.confidence.toFixed(2),
                    end: word.end.toFixed(2),
                    segment_id: word.segment_id,
                    start: word.start.toFixed(2),
                    text: word.text,
                    diff: (word.end - word.start).toFixed(2)
                })
            })
        }, fileIndex, true);

        const output = []

        let keys = []
        for (var key in speakersMap) {
            keys.push(key)
        }
        keys = keys.sort()

        keys.forEach((key) => {
            speakersMap[key].forEach((w) => {
                output.push('{0}_{1}_audio 1 {2} {3} {4} {5}'.format(
                    key,
                    w.segment_id.toString().padStart(5, '0'),
                    w.start.padStart(8, '0'),
                    w.diff,
                    w.text,
                    w.confidence
                ))
            })
        })

        return output.join('\n')
    }

    convertRegionsToRTTM(fileIndex) {
        var self = this;
        var data = [];

        this.iterateRegions(function (region) {
            data.push('SPEAKER <NA> <NA> {0} {1} <NA> <NA> {2} <NA> <NA>'.format(
                region.start.toFixed(2),
                (region.end - region.start).toFixed(2),
                self.formatSpeaker(region.data.speaker)));

        }, fileIndex, true);

        return data.join('\n');
    }

    textareaBlur() {
        if (this.isTextChanged) {
            this.addHistory(this.selectedRegion);
            this.undoStack.push([this.selectedRegion.id]);
            this.isTextChanged = false;
        }
    }

    textChanged() {
        this.isTextChanged = true;
    }

    speakerChanged(speaker) {
        var self = this;

        var speakers = self.selectedRegion.data.speaker;
        var idx = speakers.indexOf(speaker);

        // Is currently selected
        if (idx > -1) {
            speakers.splice(idx, 1);
        }

        // Is newly selected
        else {
            speakers.push(speaker);
        }

        self.addHistory(self.selectedRegion);
        self.undoStack.push([self.selectedRegion.id]);

        this.regionUpdated(self.selectedRegion);
    }

    // segmentSpeakerChanged() {
    //     var self = this;
    //
    //     self.addHistory(self.selectedRegion);
    //     self.undoStack.push([self.selectedRegion.id]);
    //
    //     this.regionUpdated(self.selectedRegion);
    // }

    newSpeakerKeyUp(e) {
        if (e.keyCode === 13) {
            this.addSpeaker();
        }
    }

    addSpeaker() {
        // var speakerNameElement = document.getElementById('newSpeakerName');

        let legend = this.filesData[this.selectedFileIndex].legend;

        if (this.newSpeakerName === '' || this.newSpeakerName in legend) return;

        // Add speaker to legend and assign random color
        const amountOfSpeakers = Object.keys(legend).length - Object.keys(constants.defaultSpeakers).length;

        legend[this.newSpeakerName] = constants.SPEAKER_COLORS[amountOfSpeakers];

        this.filesData[this.selectedFileIndex].legend = this.sortLegend(legend);

        this.newSpeakerName = "";
    }

    sortLegend(legend) {
        return sortDict(legend, undefined, function (a, b) {
                if (a in constants.defaultSpeakers && !(b in constants.defaultSpeakers)) {
                    return 1;
                }
                if (b in constants.defaultSpeakers && !(a in constants.defaultSpeakers)) {
                    return -1;
                }

                return a < b ? -1 : 1;
            }
        );
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

    changeSpeakerColor(fileIndex, speaker, color) {
        var self = this;

        self.filesData[fileIndex].legend[speaker] = color;

        this.iterateRegions(function (region) {
            if (region.data.speaker.indexOf(speaker) > -1) {
                //region.color = color;
                self.regionUpdated(region);
            }
        }, fileIndex);
    }

    loadServerMode() {
        var self = this;

        if (self.wavesurfer) self.wavesurfer.destroy();
        self.init(self.$scope);

        this.dataManager.loadFileFromServer().then(function (res) {
            // var uint8buf = new Uint8Array(res.audioFile);
            // self.wavesurfer.loadBlob(new Blob([uint8buf]));
            self.wavesurfer.loadBlob(res.audioFile);
            self.audioFileName = res.audioFileName;
            res.segmentFiles.forEach(x => x.data = self.handleTextFormats(x.filename, x.data));
            self.filesData = res.segmentFiles;
        })
    }

    loadClientMode() {
        var self = this;
        var modalInstance = this.$uibModal.open({
            templateUrl: audioModalTemplate,
            controller: function ($scope, $uibModalInstance, $timeout, zoom) {
                $scope.newSegmentFiles = [undefined];

                $scope.ok = function () {
                    // Take only selected files
                    var segmentsFiles = [];
                    for (var i = 0; i < $scope.newSegmentFiles.length; i++) {
                        var current = $scope.newSegmentFiles[i];
                        if (current && current.name && current.name !== "") {
                            segmentsFiles.push(current);
                        }
                    }

                    var call_from_url;
                    if ($scope.chosen_call_id) {
                        if ($scope.chosen_call_id.length !== 1) {
                            alert("Please choose only one call");
                            return;
                        }
                        call_from_url = $scope.chosen_call_id[0];
                    }

                    $uibModalInstance.close({
                        audio: $scope.newAudioFile,
                        call_from_url: call_from_url,
                        segmentsFiles: segmentsFiles,
                        zoom: $scope.zoom
                    });
                };

                $scope.zoom = zoom;

                $scope.selectAudio = function () {
                    inputAudio.value = "";
                    inputAudio.click();
                };

                $scope.loadUrls = function () {
                    var filename = $scope.newAudioFile.name;
                    var ext = filename.substr(filename.lastIndexOf('.') + 1);
                    if (ext === 'json') {
                        var reader = new FileReader();

                        var self = this;
                        reader.onload = function (e) {
                            $scope.$evalAsync(function () {
                                $scope.call_urls = JSON.parse(e.target.result)
                                    .map(function (x) {
                                        var k = Object.keys(x)[0];
                                        return {'id': k, 'url': x[k]}
                                    });
                            });
                        };

                        reader.readAsText($scope.newAudioFile);
                    } else {
                        $scope.$evalAsync(function () {
                            $scope.call_urls = undefined;
                            $scope.chosen_call_id = undefined;
                        });
                    }
                };


                $scope.selectTextFile = function (id) {
                    var inputElement = document.getElementById(id);
                    inputElement.value = "";
                    inputElement.click();
                }

                $scope.addFileSlot = function () {
                    $timeout(function () {
                        if ($scope.newSegmentFiles[$scope.newSegmentFiles.length - 1] !== undefined) {
                            $scope.newSegmentFiles.push(undefined);
                        }
                    });
                }

                $scope.handleMultiple = function (extra_files) {
                    $scope.newSegmentFiles = $scope.newSegmentFiles.concat(extra_files);
                }

                $scope.cancel = function () {
                    $uibModalInstance.dismiss('cancel');
                };
            },
            resolve: {
                zoom: function () {
                    return constants.ZOOM;
                }
            }
        });

        modalInstance.result.then(function (res) {
            if (self.wavesurfer) self.wavesurfer.destroy();
            self.init(self.$scope);
            self.parseAndLoadAudio(res);
        });
    }

    parseAndLoadAudio(res) {
        var self = this;

        if (res.call_from_url) {
            self.audioFileName = res.call_from_url.id;
            self.wavesurfer.load(res.call_from_url.url);
            self.parseAndLoadText(res);

        } else {

            self.readAudioFile(res.audio, function (data) {
                var uint8buf = new Uint8Array(data);
                // ldb.set('audioData', uint8buf);
                self.wavesurfer.loadBlob(new Blob([uint8buf]));
                self.parseAndLoadText(res);
            });
        }

    }

    parseAndLoadText(res) {
        var self = this;
        self.filesData = []

        var i = 0;

        // force recursion in order to keep the order of the files
        function cb(data) {
            self.filesData.push({filename: res.segmentsFiles[i].name, data: data});
            i++;
            if (i < res.segmentsFiles.length) {
                self.readTextFile(res.segmentsFiles[i], cb);
            }
        }

        if (i < res.segmentsFiles.length) {
            self.readTextFile(res.segmentsFiles[i], cb);

        } else {
            var filename = self.audioFileName.substr(0, self.audioFileName.lastIndexOf('.')) + ".txt";
            if (filename === ".txt") {
                filename = self.audioFileName + ".txt";
            }
            self.filesData.push(
                {
                    filename: filename,
                    data: []
                });
        }
    }

    handleTextFormats(filename, data) {
        var ext = filename.substr(filename.lastIndexOf('.') + 1);

        switch (ext) {
            case "rttm":
                return this.readRTTM(data)
                break;
            case "tsv":
                return this.readTSV(data);
                break;
            case "json":
                return this.readGongJson(data);
                break;
            case "ctm":
                return this.readCTM(data);
                break;
            default:
                alert("format " + ext + " is not supported");
                return undefined;
        }
    }

    readGongJson(data) {
        data = JSON.parse(data)

        // this.EDER = data['EDER'];
        //this.segmentation = data['Segmentation'];

        var monologues = data['monologues'];
        for (var i = 0; i < monologues.length; i++) {
            var monologue = monologues[i];


            if (!monologue.speaker) {
                // monologue.speaker = {id: constants.UNKNOWN_SPEAKER};
                monologue.speaker = "";
            }

            if (monologue.start === undefined) monologue.start = monologue.terms[0].start;
            if (monologue.end === undefined) monologue.end = monologue.terms.slice(-1)[0].end;


            if (!monologue.text && monologue.terms) {
                monologue.text = "";
                for (var t = 0; t < monologue.terms.length; t++) {
                    var term = monologue.terms[t];
                    if (term.text) {
                        if (term.type === "WORD") {
                            monologue.text += " ";
                        }

                        monologue.text += term.text;
                    }
                }
            }
        }
        return monologues;
    }

    readCTM(data) {
        let monologues = [];

        let lines = data.split(/\r|\n/);
        let words = lines.filter(function (line) {
            return line !== "";
        }).map(function (line) {
            let cells = line.match(/\S+/g);

            let start = parseFloat(cells[2]);
            let duration = parseFloat(cells[3]);
            let end = start + duration;

            return {
                speaker: {id: cells[0].split('_')[0]},
                segment_id: parseInt(cells[0].split('_')[1]),
                start: start,
                end: end,
                text: cells[4],
                confidence: parseFloat(cells[5])
            }
        });


        let lastMonologue = -1;

        words.sort(function (x, y) {
            if (x.start > y.start) {
                return 1;
            }

            return -1;
        })

        words.forEach(function (word) {

            if (word.segment_id !== lastMonologue) {
                lastMonologue = word.segment_id;
                monologues.push({
                    speaker: word.speaker,
                    start: word.start,
                    words: [word]
                });
            } else {
                monologues[monologues.length - 1].words.push(word);
            }

        });

        monologues.forEach(function (m) {
            let lastWord = m.words[m.words.length - 1];
            m.end = lastWord.end;
        });

        this.ctmData.push(words);

        return monologues;
    }

    readRTTM(data) {
        var monologues = [];

        var lines = data.split(/\r|\n/);
        for (var i = 0; i < lines.length; i++) {
            if (lines[i] === "") continue;

            var cells = lines[i].match(/\S+/g);
            var speaker = cells[7];
            var start = parseFloat(cells[3]);
            var duration = parseFloat(cells[4]);
            var end = start + duration;

            monologues.push({speaker: {id: speaker}, start: start, end: end});
        }

        return monologues;
    }

    readTSV(data) {
        var monologues = [];
        var lines = data.split(/\r|\n/);
        for (var i = 0; i < lines.length; i++) {
            if (lines[i] === "") continue;
            var cells = lines[i].split('\t');

            var speaker = cells[2];
            var start = parseFloat(cells[0]);
            var end = parseFloat(cells[1]);
            monologues.push({speaker: {id: speaker}, start: start, end: end});

        }

        return monologues;
    }

    readAudioFile(file, cb) {
        this.audioFileName = file.name;
        var reader = new FileReader();
        var f = file;
        if (!f) {
            return;
        }

        var self = this;

        reader.onload = (function (theFile) {
            return function (e) {
                cb(e.target.result);
            };
        })(f);

        reader.readAsArrayBuffer(f);
    }

    readTextFile(file, cb) {
        // check for empty file object
        if (Object.keys(file).length === 0 && file.constructor === Object) {
            cb(undefined);
            return;
        }
        var reader = new FileReader();

        var self = this;
        reader.onload = function (e) {
            cb(self.handleTextFormats(file.name, e.target.result));
        };

        reader.readAsText(file);
    }

    openShortcutsInfo() {
        var self = this;
        var modalInstance = this.$uibModal.open({
            templateUrl: shortcutsInfoTemplate,
            controller: function ($scope, $uibModalInstance) {
                $scope.ok = function () {
                    $uibModalInstance.close();
                };

                //TODO: prettify the html by integrating symbols
                $scope.shortcuts = [
                    {'key': 'Space bar', 'desc': 'Play/Pause'},
                    {'key': 'Enter', 'desc': 'Play segment'},
                    {'key': 'Right/Left Arrow', 'desc': 'Skip forward/backward'},
                    {'key': 'Ctrl + Right Arrow', 'desc': 'Next difference (comparing mode)'},
                    {'key': 'Delete/Backspace', 'desc': 'Delete segment'},
                    {'key': 'Ctrl + z', 'desc': 'Undo'},
                    {'key': '1-9', 'desc': 'Select annotation'},
                    {'key': 'Escape', 'desc': 'Focus-out text area'},
                    {'key': 'Ctrl+[', 'desc': 'Move back 5 seconds'}
                ]
            }
        });
    }

    wordChanged(regionIndex, wordIndex) {
        let newWord = this.currentRegions[regionIndex].data.words[wordIndex]
        newWord.wasEdited = true
        if (newWord.text.length) {
            let newWordSplited = newWord.text.split(' ')
            if (newWordSplited.length > 1) {
                this.currentRegions[regionIndex].data.words[wordIndex].text = newWordSplited[0]
                for (let i = newWordSplited.length - 1; i >= 1; i--) {
                    let wordCopy = Object.assign({}, this.currentRegions[regionIndex].data.words[wordIndex])
                    wordCopy.text = newWordSplited[i]
                    this.currentRegions[regionIndex].data.words.splice(wordIndex + 1, 0, wordCopy)
                }
            }
        } else {
            this.currentRegions[regionIndex].data.words.splice(wordIndex, 1)
        }
    }

    wordClick(word, e) {
        const isMacMeta = window.navigator.platform === 'MacIntel' && e.metaKey
        const isOtherControl =  window.navigator.platform !== 'MacIntel' && e.ctrlKey
        const isDownCtrl = isMacMeta || isOtherControl
        if (isDownCtrl) {
            this.wavesurfer.play(word.start)
        }
        e.preventDefault()
        e.stopPropagation()
    }

    editableKeysMapping(regionIndex, wordIndex, keys, which) {
        if (keys === 'space') {
            this.playPause()
        } else if (keys === 'ArrowRight') {
            let nextIndex = wordIndex + 1
            if (nextIndex < this.currentRegions[regionIndex].data.words.length) {
                const nextWord = document.getElementById(`word_${regionIndex}_${nextIndex}`)
                nextWord.focus()
            } else {
                var nextRegion = this.findClosestRegionToTime(this.currentRegions[regionIndex].data.fileIndex, this.currentRegions[regionIndex].end)
                if (nextRegion) {
                    this.wavesurfer.setCurrentTime(nextRegion.start)
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
            } else {
                var prevRegion = this.findClosestRegionToTimeBackward(this.currentRegions[regionIndex].data.fileIndex, this.currentRegions[regionIndex].end)
                if (prevRegion) {
                    this.wavesurfer.setCurrentTime(prevRegion.end)
                    this.$timeout(() => {
                        const lastIndex = this.currentRegions[regionIndex].data.words.length - 1
                        const prevWord = document.getElementById(`word_${regionIndex}_${lastIndex}`)
                        if (prevWord) {
                            prevWord.focus()
                        }
                    })
                }
            }
        } else if (keys === 'alt_space') {
            this.playRegion()
        } else if (which) {
            if (which === 219) {
                this.moveBack()
            }
        }
    }

    moveBack () {
        const toTime = this.wavesurfer.getCurrentTime()
        if (toTime > 5) {
            this.wavesurfer.setCurrentTime(toTime - 5)
        } else {
            this.wavesurfer.setCurrentTime(0)
        }
    }
}

MainController
    .$inject = ['$scope', '$uibModal', 'dataManager', '$timeout'];
export {
    MainController
}