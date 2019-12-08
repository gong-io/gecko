import '../static/css/bootstrap.min.theme_paper.css'
import '../static/css/app.css'

import '../static/js/bootstrap.min.js'

import 'video.js/dist/video-js.min.css'

import {MainController} from './controller.js'
import {dataManager} from './dataManager.js'
import {dataBase} from './dataBase.js'
import {Checklist} from './third-party/checked-list.js'
import dropdown from 'angular-ui-bootstrap/src/dropdown'
import modal from 'angular-ui-bootstrap/src/modal'
import collapse from 'angular-ui-bootstrap/src/collapse'
import tooltip from 'angular-ui-bootstrap/src/tooltip'
import './third-party/localStorageDB.js'
import {playPartDirective} from './playPartDirective'
import {editableWordsDirective} from './editableWordsDirective'
import {proofReadingViewDirective} from './proofReadingViewDirective'
import EventBus from './eventBusService'

var speechRecognition = angular.module('speechRecognition', [dropdown, modal, collapse, tooltip]);

speechRecognition.controller('MainController', MainController);

speechRecognition.config(function($httpProvider) {
    //Enable cross domain calls
    $httpProvider.defaults.useXDomain = true;
})

speechRecognition.service('eventBus', ['$timeout', EventBus])
speechRecognition.service('dataManager', dataManager);
speechRecognition.service('dataBase', dataBase);
speechRecognition.service('eventBus', EventBus)
speechRecognition.directive('playPart', playPartDirective);
speechRecognition.directive('checklistModel', Checklist);
speechRecognition.directive("fileread", [function () {
    return {
        scope: {
            fileread: "=",
            afterread: '&?',
            handlemultiple: '&?'
        },
        link: function (scope, element, attributes) {
            element.bind("change", function (changeEvent) {
                scope.$apply(function () {
                    var files = changeEvent.target.files;
                    scope.fileread = files[0];

                    if (scope.handlemultiple) {
                        var extrafiles = []
                        for (var i = 1; i < files.length; i++) {
                            extrafiles.push(files[i]);
                        }
                        scope.handlemultiple({extrafiles: extrafiles});
                    }

                    if (scope.afterread) {
                        scope.$$postDigest(function () {
                            scope.afterread();
                        });
                    }
                    // or all selected files:
                    // scope.fileread = changeEvent.target.files;
                });
            });
        }
    }
}]);

speechRecognition.directive('editableWords', ['$timeout', 'eventBus', editableWordsDirective])
speechRecognition.directive('proofReadingView', ['$timeout', 'eventBus', proofReadingViewDirective])

speechRecognition.directive("editable", function () {
    return {
        restrict: "A",
        require: "ngModel",
        scope: {
            changed: '&',
            keysMapping: '&'
        },
        link: function (scope, element, attrs, ngModel) {
            element[0].setAttribute('contenteditable', true);

            function read() {
                // view -> model
                let newText = element.text();
                let oldText = ngModel.$viewValue;

                if (oldText !== newText) {
                    ngModel.$setViewValue(newText);

                    if (scope.changed) {
                        let returnValue = scope.changed({oldText: oldText, newText: newText})

                        if (returnValue === false){
                            ngModel.$setViewValue(oldText);
                            // force render
                            // probably because old == new so it does not render
                            ngModel.$render();
                        }
                    }
                }
            }

            // model -> view
            ngModel.$render = function () {
                element.text(ngModel.$viewValue || "");
            };

            element.bind('click', function () {
                event.stopPropagation();
                event.preventDefault();
            });

            element.bind("blur", function () {
                scope.$apply(read);
            });

            element.bind('dblclick', (e) => {
                document.execCommand('selectAll',false,null)
            })

            element.bind("keydown keypress", function (e) {
                if (e.which === 13 || e.which === 27) {
                    this.blur();
                    e.preventDefault();
                }

                e.stopPropagation()
            });

            element.bind('paste', (e) => {
                if (e && e.originalEvent) {
                    const clipboardData = e.originalEvent.clipboardData
                    if (clipboardData) {
                        const text = clipboardData.getData('text/plain')
                        document.execCommand('insertText', false, text)
                    }
                }
                e.preventDefault()
            })


            element.bind("keydown", function (e) {
                const isMacMeta = window.navigator.platform === 'MacIntel' && e.metaKey
                const isAlt = e.altKey
                const isOtherControl = window.navigator.platform !== 'MacIntel' && e.ctrlKey
                const isDownCtrl = isMacMeta || isOtherControl
                const systemKeys = [ 65, 88, 67, 86, 90, 89] // a, x, c, v, z, y
                if (isDownCtrl || isAlt) {
                    if (e.which === 32) {
                        this.blur()
                        scope.keysMapping({keys: 'space'})
                        e.preventDefault()
                        e.stopPropagation()
                        return
                    }
                }

                if (isDownCtrl && e.which !== 91 && e.which !== 17) { // not a only ctrl button
                    if (systemKeys.includes(e.which)) {
                        return
                    }
                    this.blur()
                    scope.keysMapping({keys: e.key, which: e.which})
                    e.preventDefault()
                    e.stopPropagation()
                    return
                }

            })
        }
    };
});

speechRecognition.filter("mulSearch", function () {
    return function (items, searchText) {
        if (!searchText) return items;

        let onlyUnmarked = false;

        if (searchText[0] === '!') {
            onlyUnmarked = true;
            searchText = searchText.substring(1);
        }

        let searchWords = searchText.toLowerCase().split(',');

        return items.filter(x => {
            if (onlyUnmarked && x.choice) {
                return false;
            }
            return searchWords.some(searchWord => {
                    return (x.newText && x.newText.toLowerCase().includes(searchWord))
                        || (x.oldText && x.oldText.toLowerCase().includes(searchWord));
                }
            );
        });
    }
})

speechRecognition.filter("speakersFilter", function () {
    return function (items) {
        if (items && items.length) {
            return items.join(', ')
        } else if (items && !items.length) {
            return 'No speaker'
        } else {
            return ''
        }
    }
})

speechRecognition.filter("speakersFilterColor", function () {
    return function (items, legend) {
        if (items && items.length) {
            const spans = items.map(s => `<span style="color: ${legend[s]};">${s}</span>`)
            return spans.join(', ')
        } else if (items && !items.length) {
            return 'No speaker'
        } else {
            return ''
        }
    }
})

speechRecognition.filter('to_trusted', ['$sce', function($sce){
    return function(text) {
        return $sce.trustAsHtml(text);
    };
}])

speechRecognition.filter('toMMSS', function(){
    return (seconds) => {
        return new Date(seconds * 1000).toISOString().substr(14, 5)
    }
})
