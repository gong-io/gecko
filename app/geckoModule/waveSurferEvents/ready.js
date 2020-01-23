import '../utils/soundtouch.js'

import { secondsToMinutes } from '../utils'
import * as constants from '../constants'

import play from './play'

export default (parent) => {
    parent.previousHeight = parseInt(parent.wavesurfer.getHeight())
    parent.totalTime = secondsToMinutes(parent.wavesurfer.getDuration())
    parent.wavesurfer.enableDragSelection(
        {
            drag: false,
            minLength: constants.MINIMUM_LENGTH
        });

    parent.$scope.$watch(() => parent.zoomLevel, (newVal) => {
        if (newVal) {
            parent.wavesurfer.zoom(parent.zoomLevel)
            parent.zoomTooltip.update()
        }
    })

    parent.$scope.$watch(() => parent.currentGainProc, (newVal) => {
        if (newVal) {
            parent.gainNode.gain.value = newVal / 100
        }
    })

    parent.createSpeakerLegends()

    parent.addRegions()


    // // map between speakers according to EDER mapping
    // if (parent.EDER) {
    //     var mapping = parent.EDER.map;
    //     for (let s in parent.speakersColors) {
    //         var mapped = mapping[s];
    //         if (mapped) {
    //             parent.speakersColors[mapped] = parent.speakersColors[s];
    //         }
    //     }
    // }

    parent.transcriptPanelSize = parseInt(9 / parent.filesData.length)

    // select the first region
    parent.selectedFileIndex = 0
    parent.selectRegion()

    // var interval = setInterval(function () {
    //     parent.iterateRegions(function (region) {
    //         if (region.end <= region.start) {
    //             alert("STOP! CALL GOLAN.");
    //             console.log("start: {0} End: {1}".format(region.start, region.end));
    //             console.log(region);
    //             clearInterval(interval);
    //             throw "ERROR";
    //         }
    //     });
    // }, 100)

    const initAudioContext = () => {
        var context

        try {
            // Fix up for prefixing
            window.AudioContext = window.AudioContext || window.webkitAudioContext
            context = new AudioContext()
        } catch (e) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Web Audio API is not supported in this browser'
            })
        }

        parent.audioContext = context
    }

    initAudioContext()

    parent.handleCtm()

    parent.st = new soundtouch.SoundTouch(parent.wavesurfer.backend.ac.sampleRate)
    var buffer = parent.wavesurfer.backend.buffer
    var channels = buffer.numberOfChannels
    var l = buffer.getChannelData(0)
    var r = channels > 1 ? buffer.getChannelData(1) : l
    parent.length = buffer.length
    parent.seekingPos = null
    var seekingDiff = 0

    var source = {
        extract: (target, numFrames, position) => {
            if (parent.seekingPos != null) {
                seekingDiff = parent.seekingPos - position;
                parent.seekingPos = null
            }

            position += seekingDiff;

            for (var i = 0; i < numFrames; i++) {
                target[i * 2] = l[i + position]
                target[i * 2 + 1] = r[i + position]
            }

            return Math.min(numFrames, parent.length - position)
        }
    }

    parent.soundtouchNode = null

    parent.gainNode = parent.wavesurfer.backend.ac.createGain()
    parent.gainNode.gain.value = parent.currentGainProc / 100

    var filter = new soundtouch.SimpleFilter(source, parent.st)
    parent.soundtouchNode = soundtouch.getWebAudioNode(parent.wavesurfer.backend.ac, filter)

    parent.wavesurfer.on('play', () => play(parent))

    parent.loader = false
    parent.ready = true

    window.onbeforeunload = (event) => {
        return confirm('Confirm refresh')
    };

    parent.$scope.$evalAsync();
}