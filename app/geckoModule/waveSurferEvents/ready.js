import BufferedOLA from '../utils/buffered-ola'

import {secondsToMinutes} from '../utils'
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
        parent.gainNode.gain.value = newVal / 100
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

        parent.store.setValue('audioContext', context)
        parent.audioContext = context
    }

    initAudioContext()

    parent.handleComparsion()
    parent.calculatePanelsWidth(true)

    parent.length = parent.wavesurfer.backend.buffer.length

    parent.olatsNode = parent.wavesurfer.backend.ac.createScriptProcessor(constants.OLATS_BUFFER_SIZE, 2)
    parent.olatsNode.onaudioprocess = function (e) {
        parent.buffOla.process(e.outputBuffer)
    }

    parent.buffOla = new BufferedOLA(constants.OLATS_BUFFER_SIZE)
    parent.buffOla.set_audio_buffer(parent.wavesurfer.backend.buffer)

    parent.gainNode = parent.wavesurfer.backend.ac.createGain()
    parent.gainNode.gain.value = parent.currentGainProc / 100

    parent.wavesurfer.on('play', () => play(parent))

    parent.loader = false
    parent.ready = true

    window.onbeforeunload = (event) => {
        return confirm('Confirm refresh')
    };

    parent.setCurrentTime()

    if(parent.onlyProofreading){
        parent.proofReadingView = false; // toggle changes it to true
        parent.toggleProofReadingView();
        parent.toggleSegmentLabeling();
    }

    parent.$scope.$evalAsync();
}