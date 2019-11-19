import '../third-party/soundtouch.js'

import { secondsToMinutes } from '../utils'
import * as constants from '../constants'

export default (wavesurferEvents) => {
    const self = wavesurferEvents.parent

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
    })

    self.$scope.$watch(() => self.currentGainProc, function (newVal) {
        if (newVal) {
            self.gainNode.gain.value = newVal / 100
        }
    })

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

    self.st = new soundtouch.SoundTouch(self.wavesurfer.backend.ac.sampleRate)
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

    self.gainNode = self.wavesurfer.backend.ac.createGain()
    self.gainNode.gain.value = self.currentGainProc / 100

    var filter = new soundtouch.SimpleFilter(source, self.st)
    self.soundtouchNode = soundtouch.getWebAudioNode(self.wavesurfer.backend.ac, filter)

    self.wavesurfer.on('play', () => wavesurferEvents.play())

    self.loader = false
    self.ready = true

    window.onbeforeunload = function (event) {
        return confirm('Confirm refresh')
    };

    self.$scope.$evalAsync();
}