import Swal from 'sweetalert2'

import { ZOOM } from '../constants'
import loadDraftModal from './loadDraftModal'
import { formatTime } from '../utils'

var demoJson = require('../../../samples/demo.json')

const audioModalTemplate = require('ngtemplate-loader?requireAngular!html-loader!../templates/selectAudioModal.html')

export default (parent) => {
    return {
        templateUrl: audioModalTemplate,
        backdrop: 'static',
        controller: async ($scope, $uibModalInstance, $timeout, zoom) => {
            $scope.draftAvailable = false
            $scope.isLoading = false
            $scope.newSegmentFiles = [undefined]
            
            if (parent.config.enableDrafts && parent.dataBase) {
                const draftCounts = await parent.dataBase.getCounts(0)
                if (draftCounts) {
                    parent.$timeout(() => {
                        $scope.draftAvailable = true
                    })
                }
            }
 
            $scope.runDemo = async () => {
                if ($scope.isLoading) {
                    return
                }

                $scope.isLoading = true
                const demoFile = {
                    filename: 'demo.json',
                    data: parent.handleTextFormats('demo.json', JSON.stringify(demoJson))[0]
                }
                parent.init()
                parent.filesData = [
                    demoFile
                ];
                parent.audioFileName = 'demo.mp3';
                parent.loader = true
                $uibModalInstance.close(false)

                const res = await parent.dataManager.loadFileFromServer({
                    audio: {
                        url: 'https://raw.githubusercontent.com/gong-io/gecko/master/samples/demo.mp3'
                    },
                    ctms: []
                })
                if (parent.config.enableDrafts && parent.dataBase) {
                    const demoDraft = await parent.dataBase.createDraft({
                        mediaFile: {
                            name: 'demo.mp3',
                            data: res.audioFile
                        },
                        files: parent.filesData,
                        draftType: 0
                    })
                    parent.currentDraftId = demoDraft
                    parent.lastDraft = formatTime(new Date())
                }

                parent.wavesurfer.loadBlob(res.audioFile);
                $scope.isLoading = false
            };

            $scope.loadDraft = async () => {
                // $uibModalInstance.close(false)
                // parent.loadDraft()
                if (parent.dataBase) {
                    const drafts = await parent.dataBase.getDrafts(0)
                    const modalInstance = parent.$uibModal.open(loadDraftModal(parent, drafts))
                    modalInstance.result.then(async (res) => {
                        if (res) {
                            $uibModalInstance.close(false)
                            parent.loadDraft(res)
                        }
                    });
                }
                           
            };

            $scope.ok = () => {
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
                        Swal.fire({
                            icon: 'warning',
                            title: 'Please choose only one call'
                        })
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

            $scope.selectAudio = () => {
                inputAudio.value = "";
                inputAudio.click();
            };

            $scope.loadUrls = () => {
                var filename = $scope.newAudioFile.name;
                var ext = filename.substr(filename.lastIndexOf('.') + 1);
                if (ext === 'json') {
                    var reader = new FileReader();

                    reader.onload = (e) => {
                        $scope.$evalAsync(() => {
                            $scope.call_urls = JSON.parse(e.target.result)
                                .map((x) => {
                                    var k = Object.keys(x)[0];
                                    return {'id': k, 'url': x[k]}
                                });
                        });
                    };

                    reader.readAsText($scope.newAudioFile);
                } else {
                    $scope.$evalAsync(() => {
                        $scope.call_urls = undefined;
                        $scope.chosen_call_id = undefined;
                    });
                }
            };


            $scope.selectTextFile = (id) => {
                var inputElement = document.getElementById(id);
                inputElement.value = "";
                inputElement.click();
            }

            $scope.addFileSlot = () => {
                $timeout(() => {
                    if ($scope.newSegmentFiles[$scope.newSegmentFiles.length - 1] !== undefined) {
                        $scope.newSegmentFiles.push(undefined);
                    }
                });
            }

            $scope.handleMultiple = (extra_files) => {
                $scope.newSegmentFiles = $scope.newSegmentFiles.concat(extra_files);
            }

            $scope.cancel = () => {
                $uibModalInstance.dismiss('cancel');
            };

            $scope.$watch('newAudioFile', (newVal) => {
                if (!newVal) {
                    return
                }
                const reader = new FileReader()
                reader.onload = (event) => {
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    try {
                        audioContext.decodeAudioData(event.target.result).then((buffer) => {
                        }).catch(e => {
                            Swal.fire({
                                icon: 'warning',
                                title: 'Audio decoding error',
                                text: e
                            })
                        });
                    } catch (e) {
                        Swal.fire({
                            icon: 'warning',
                            title: 'Audio decoding error',
                            text: e
                        })
                    }
                };
                reader.readAsArrayBuffer(newVal)
            })
        },
        resolve: {
            zoom: () => {
                return ZOOM;
            }
        }
    }
}