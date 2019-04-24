import {MainController} from './controller.js'
import {Checklist} from './third-party/checked-list.js'
import angular from 'angularjs';
import dropdown from 'angular-ui-bootstrap/src/dropdown'
import modal from 'angular-ui-bootstrap/src/modal'
import collapse from 'angular-ui-bootstrap/src/collapse'
import './third-party/localStorageDB.js'

var speechRecognition = angular.module('speechRecognition', [dropdown, modal, collapse]);

speechRecognition.controller('MainController', MainController);
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

                    if (scope.handlemultiple){
                        var extrafiles = []
                        for (var i=1 ; i<files.length; i++){
                            extrafiles.push(files[i]);
                        }
                        scope.handlemultiple({extrafiles:extrafiles});
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
speechRecognition.filter("mulSearch", function(){
    return function(items, searchText){
        if(!searchText) return items;

        let onlyUnmarked = false;

        if(searchText[0] === '!'){
            onlyUnmarked = true;
            searchText = searchText.substring(1);
        }

        let searchWords = searchText.toLowerCase().split(',');

        return items.filter(x => {
            if (onlyUnmarked && x.choice){
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