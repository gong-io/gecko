const playPartTemplate = require('ngtemplate-loader?requireAngular!html-loader!../templates/playPart.html')

export const playPartDirective = (store) => {
    return {
        replace: true,
        restrict: "E",
        scope: {
            'rep': '=representative',
            'label': '=label',
        },
        templateUrl: playPartTemplate,
        link: (scope, element, attrs) => {
            if(!scope.rep){
                scope.rep = {};
            }
            scope.totalDuration = scope.$parent.ctrl.totalDuration;

            //taken from:
            //https://github.com/vikasmagar512/wavesurfer-audio-editor/blob/master/src/utils/waveSurferOperation.js
            const cut = (start, end) => {
                /*
                ---------------------------------------------
                The function will take the buffer used to create the waveform and will
                create
                a new blob with the selected area from the original blob using the
                offlineAudioContext
                */
               const audioBackend = store.getValue('audioBackend')
                var originalAudioBuffer = audioBackend.buffer;

                var lengthInSamples = Math.ceil((end - start) * originalAudioBuffer.sampleRate);
                if (!window.OfflineAudioContext) {
                    if (!window.webkitOfflineAudioContext) {
                        // $('#output').append('failed : no audiocontext found, change browser');
                        alert('webkit context not found')
                    }
                    window.OfflineAudioContext = window.webkitOfflineAudioContext;
                }

                var offlineAudioContext = audioBackend.ac

                var emptySegment = offlineAudioContext.createBuffer(
                    originalAudioBuffer.numberOfChannels,
                    lengthInSamples,
                    originalAudioBuffer.sampleRate);

                for (var channel = 0; channel < originalAudioBuffer.numberOfChannels; channel++) {

                    var empty_segment_data = emptySegment.getChannelData(channel);
                    var original_channel_data = originalAudioBuffer.getChannelData(channel);

                    var mid_data = original_channel_data.subarray(Math.ceil(start * originalAudioBuffer.sampleRate), Math.floor(end * originalAudioBuffer.sampleRate));

                    empty_segment_data.set(mid_data);
                }

                return emptySegment;
            }

            scope.isPlaying = false;
            let source;

            const play = () => {

//                scope.rep.start = parseFloat(scope.rep.start).toFixed(2);
//                scope.rep.end = parseFloat(scope.rep.end).toFixed(2);

                if(!isNaN(scope.rep.start) || !isNaN(scope.rep.end)){
                    if (isNaN(scope.rep.start))
                        scope.rep.start = scope.rep.end > 5 ? scope.rep.end - 5 : 0;
                    else if (isNaN(scope.rep.end))
                        scope.rep.end = scope.rep.start < scope.totalDuration - 5 ? scope.rep.start + 5 : scope.totalDuration;
                    else{
                        if (scope.rep.start > scope.rep.end){
                            let temp = scope.rep.end;
                            scope.rep.end = scope.rep.start;
                            scope.rep.start = temp;
                        }
                        if (scope.rep.start >= scope.totalDuration){
                            scope.rep.start = scope.totalDuration - 5;
                        }
                        if (scope.rep.end > scope.totalDuration){
                            scope.rep.end = scope.totalDuration;
                        }
                    }
                }
                if (isNaN(scope.rep.start) && isNaN(scope.rep.end)) {
                    let parent = scope.$parent.ctrl;
                    if (parent.selectedRegion) {
                        scope.rep.start = parent.selectedRegion.start;
                        scope.rep.end = parent.selectedRegion.end;
                    } else {
                        let firstRegion;
                        parent.iterateRegions(region => {
                                if (region.data.speaker.length === 1 && region.data.speaker[0] === scope.label){
                                    firstRegion = firstRegion ? firstRegion : region;
                                    return "STOP"
                                }
                        }, parent.selectedFileIndex)

                        if (firstRegion){
                            scope.rep.start = firstRegion.start;
                            scope.rep.end = firstRegion.end;
                        }
                        else{
                            return;
                        }
                    }
                }

                const audioContext = store.getValue('audioContext')

                source = audioContext.createBufferSource(); // creates a sound source

                source.addEventListener('ended', () => {
                    scope.isPlaying = false;
                    scope.$evalAsync();
                });

                source.buffer = cut(scope.rep.start, scope.rep.end); // tell the source which sound to play
                source.connect(audioContext.destination);       // connect the source to the context's destination (the speakers)
                source.start(0);
                scope.isPlaying = true;
            }

            const stop = () => {
                source.stop();
                scope.isPlaying = false;
            }

            scope.playStop = () => {
                scope.isPlaying ? stop() : play();
            }

            scope.formatTime = (att) => {
                if (!isNaN(scope.rep[att]))
                    scope.rep[att] = parseFloat(scope.rep[att]).toFixed(3);
                else
                    scope.rep[att] = "";
            }
            scope.isEmpty = () => {
                if(scope.rep)
                    return (isNaN(scope.rep.start) || isNaN(scope.rep.end));
                return false;
            }

            scope.clear = () => {
                scope.rep = {};
            }
        }
    }
}