const searchBarTemplate = require('ngtemplate-loader?requireAngular!html-loader!../templates/searchBarTemplate.html')

export const searchBarDirective = () => {
    return {
        replace: true,
        restrict: "E",
        scope: {
            'parent': '=',
        },
        templateUrl: searchBarTemplate,
        link: (scope, element, attrs) => {
            scope.words = [];
            scope.currentIndex = 0;
            scope.amount = 0
            scope.findText = scope.$parent.ctrl.searchBarText;
            scope.regex = false;
            scope.matchCase = false;
            scope.wholeWord = false;

            scope.toggleRegex = () => {
                scope.regex = !scope.regex;
                if (scope.regex){
                    scope.matchCase = true;
                    scope.wholeWord = false;
                }
                scope.searchInTranscript();
            }
            scope.toggleMatchCase = () => {
                scope.matchCase = !scope.matchCase;
                scope.searchInTranscript();
            }
            scope.toggleWholeWord = () => {
                if (!scope.regex){
                    scope.wholeWord = !scope.wholeWord;
                    scope.searchInTranscript();
                }
            }

            scope.searchInTranscript = () => {
                if (scope.isActive()){
                    scope.words = [];
                    let parent = scope.$parent.ctrl;

                    parent.searchBarText = scope.findText;

                    let transcript = parent.filesData[parent.selectedFileIndex].data;
                    let findText = scope.findText;
                    if(!scope.matchCase){
                        findText = scope.findText.toLowerCase()
                    }
                    let t = findText.split(" ").filter(element => element);
                    if (t.length > 1){
                        scope.wholeWord = false;

                        let words = transcript.map(mono => mono.words.filter(word => word.text.endsWith(t[0])))
                        for (let i = 0; i < words.length; i++){
                            for (let j = 0; j < words[i].length; j++){
                                let monologue = transcript[i].words.filter(word => word.start >= words[i][j].start).map(word => word.text).slice(0, t.length).join(" ")
                                if((scope.regex && monologue.match(findText)) || !scope.regex && monologue.includes(findText))
                                    scope.words.push(words[i][j]);
                            }
                        }
                    }
                    else{
                        scope.words = transcript.map(mono => mono.words.filter((word, index) => scope.searchRight(word.text, findText))).flat()
                    }
                    scope.amount = scope.words.length;
                    scope.currentIndex = 0;
                    scope.seek(0);
                }
            }

            scope.searchRight = (wordText, findText) => {
                if(!scope.matchCase){
                    wordText = wordText.toLowerCase()
                }
                if(scope.regex){
                    return wordText.match(findText);
                }
                else if(scope.wholeWord){
                    return wordText === findText;
                }
                return wordText.includes(findText);
            }

            scope.isActive = () => {
                return scope.findText != "";
            }

            scope.search = (e) => {
                if (e.which == 13){
                    scope.seek(1);
                }
            }

            scope.clear = () => {
                scope.words = [];
                scope.currentIndex = 0;
                scope.amount = 0
                scope.findText = "";
            }

            scope.seek = (i) => {
                if (scope.isActive() && scope.amount > 0){
                    if (i > 0)
                        scope.currentIndex = (scope.currentIndex + i) % scope.amount;
                    else
                        scope.currentIndex = (scope.currentIndex + i) < 0 ? scope.amount + i : (scope.currentIndex + i);
                    let currentTime = scope.words[scope.currentIndex].start;
                    let parent = scope.$parent.ctrl;
                    parent.seek(currentTime, "right");
                }
            }
        }
    }
}