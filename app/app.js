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
import './third-party/localStorageDB.js'
import {playPartDirective} from './playPartDirective'
import {editableWordsDirective} from './editableWordsDirective'

var speechRecognition = angular.module('speechRecognition', [dropdown, modal, collapse]);

speechRecognition.controller('MainController', MainController);

speechRecognition.config(function($httpProvider) {
    //Enable cross domain calls
    $httpProvider.defaults.useXDomain = true;
})


speechRecognition.service('dataManager', dataManager);
speechRecognition.service('dataBase', dataBase);
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

speechRecognition.directive('editableWords', ['$timeout', editableWordsDirective])

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

speechRecognition.filter('to_trusted', ['$sce', function($sce){
    return function(text) {
        return $sce.trustAsHtml(text);
    };
}])
