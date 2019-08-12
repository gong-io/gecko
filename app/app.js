import '../static/css/bootstrap.min.theme_paper.css'
import '../static/css/app.css'

import '../static/js/bootstrap.min.js'

import {MainController} from './controller.js'
import {dataManager} from './dataManager.js'
import {Checklist} from './third-party/checked-list.js'
import angular from 'angularjs';
import dropdown from 'angular-ui-bootstrap/src/dropdown'
import modal from 'angular-ui-bootstrap/src/modal'
import collapse from 'angular-ui-bootstrap/src/collapse'
import './third-party/localStorageDB.js'

var speechRecognition = angular.module('speechRecognition', [dropdown, modal, collapse]);

speechRecognition.controller('MainController', MainController);


speechRecognition.service('dataManager', dataManager);
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

speechRecognition.directive("editable", function () {
    return {
        restrict: "A",
        require: "ngModel",
        scope:{
            changed: '&',
            keysMapping: '&'
        },
        link: function (scope, element, attrs, ngModel) {
            element[0].setAttribute('contenteditable', true);

            function read() {
                // view -> model
                var text = element.text();
                if (ngModel.$viewValue !== text && scope.changed) {
                    scope.changed()
                }
                ngModel.$setViewValue(text);
            }

            // model -> view
            ngModel.$render = function () {
                element.text(ngModel.$viewValue || "");
            };

            element.bind("blur", function () {
                scope.$apply(read);
            });
            element.bind("keydown keypress", function (e) {
                if (e.which === 13 || e.which === 27) {
                    this.blur();
                    e.preventDefault();
                } 

                e.stopPropagation()
            });

            element.bind("keydown", function (e) {
                const isMacMeta = window.navigator.platform === 'MacIntel' && e.metaKey
                const isAlt = e.altKey
                const isOtherControl =  window.navigator.platform !== 'MacIntel' && e.ctrlKey
                const isDownCtrl = isMacMeta || isOtherControl
                if (isDownCtrl || isAlt) {
                    if (e.which === 32) {
                        scope.keysMapping({ keys: 'space' })
                        e.preventDefault()
                        e.stopPropagation()
                        return
                    }
                }

                if (isDownCtrl) {
                    scope.keysMapping({ keys: e.key, which: e.which })
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

