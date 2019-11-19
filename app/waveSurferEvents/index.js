import { secondsToMinutes } from '../utils'
import * as constants from '../constants'

export default class WaveSurferEvents {
    constructor (parent) {
        this.parent = parent
    }

    seek () {
        this.parent.updateView()
        this.parent.videoPlayer && this.parent.videoPlayer.currentTime(this.parent.wavesurfer.getCurrentTime())

        this.parent.$scope.$evalAsync()
    }

    regionUpdated (region) {
        this.parent.regionPositionUpdated(region)
    }

    regionUpdateEnd (region) {
        const self = this.parent

        self.regionPositionUpdated(region)

        var multiEffect = [region.id]
        self.addHistory(region)

        for (let r of self.updateOtherRegions) {
            self.addHistory(r)
            multiEffect.push(r.id)
        }

        self.updateOtherRegions.clear()
        self.undoStack.push(multiEffect)

        self.$scope.$evalAsync()
    }

    regionClick (region) {
        this.parent.isRegionClicked = true
        this.parent.selectedFileIndex = region.data.fileIndex
    }

    regionIn (region) {
        if (region.data.fileIndex === this.parent.selectedFileIndex) {
            this.parent.selectRegion(region)
        }
        this.parent.currentRegions[region.data.fileIndex] = region
    }

    regionOut (region) {
        if (region.data.fileIndex === this.parent.selectedFileIndex) {
            this.parent.deselectRegion(region)
        }
        this.parent.currentRegions[region.data.fileIndex] = undefined;
    }

    pause () {
        this.parent.soundtouchNode && this.parent.soundtouchNode.disconnect()
        this.parent.isPlaying = false
        this.parent.$scope.$evalAsync()
    }

    loading () {
        this.parent.$scope.$evalAsync(() => {
            this.parent.loader = true
        })
    }

    regionCreated (region) {
        const self = this.parent

        if (self.isDownCtrl) {
            if (self.dummyRegion) {
                self.addHistory(self.dummyRegion)
                self.undoStack.push([ self.dummyRegion.id ])
                self.dummyRegion.remove()
            }
            region.isDummy = true
            self.dummyRegion = region
            self.addHistory(region);
            self.undoStack.push([ region.id ])
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

    ready () {
        const self = this.parent

        self.previousHeight = parseInt(self.wavesurfer.getHeight())
        self.totalTime = secondsToMinutes(self.wavesurfer.getDuration())
        self.wavesurfer.enableDragSelection(
            {
                drag: false,
                minLength: constants.MINIMUM_LENGTH
            });

        self.$scope.$watch(() => self.zoomLevel, function (newVal) {
            if (newVal) {
                self.wavesurfer.zoom(self.zoomLevel)
            }
        });

        self.createSpeakerLegends()

        self.addRegions()


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

        self.transcriptPanelSize = parseInt(9 / self.filesData.length)

        // select the first region
        self.selectedFileIndex = 0
        self.selectRegion()

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

        self.initAudioContext()

        self.handleCtm()

        var st = new soundtouch.SoundTouch(self.wavesurfer.backend.ac.sampleRate)
        var buffer = self.wavesurfer.backend.buffer
        var channels = buffer.numberOfChannels
        var l = buffer.getChannelData(0)
        var r = channels > 1 ? buffer.getChannelData(1) : l
        self.length = buffer.length
        self.seekingPos = null
        var seekingDiff = 0

        var source = {
            extract: function (target, numFrames, position) {
                if (self.seekingPos != null) {
                    seekingDiff = self.seekingPos - position;
                    self.seekingPos = null
                }

                position += seekingDiff;

                for (var i = 0; i < numFrames; i++) {
                    target[i * 2] = l[i + position]
                    target[i * 2 + 1] = r[i + position]
                }

                return Math.min(numFrames, self.length - position)
            }
        }


        self.soundtouchNode = null

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
            self.$scope.$evalAsync();
        });

        self.wavesurfer.on('pause', () => this.pause())
        self.loader = false
        self.ready = true

        window.onbeforeunload = function (event) {
            return confirm("Confirm refresh");
        };

        self.$scope.$evalAsync();
    }
}