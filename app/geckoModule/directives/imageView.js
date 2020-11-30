const imageViewTemplate = require('ngtemplate-loader?requireAngular!html-loader!../templates/imageView.html')


export const imageViewDirective = () => {
    return {
        restrict: "E",
        scope: {
            'parent': '='
        },
        templateUrl: imageViewTemplate,
        link: (scope, element, attrs) => {
            scope.filteredIndex = scope.parent.indexes.findIndex(element => element === scope.parent.imageIndex);

            scope.imageIndex = scope.parent.imageIndex;
            scope.canvas = document.getElementById('canvas');
            scope.presentationCheckbox = document.getElementById('PresentationCheckbox');
            scope.predictedTitle = document.getElementById('PredictedTitle');
            scope.change = (diff) => {
                scope.updateList();

                if (diff > 0)
                    scope.filteredIndex = (scope.filteredIndex + diff) % (scope.parent.indexes.length - 1);
                else
                    scope.filteredIndex = scope.filteredIndex + diff >= 0 ? scope.filteredIndex + diff : scope.parent.indexes.length - 1;
                let newIndex = scope.parent.indexes[scope.filteredIndex];

                let promise = scope.parent.imageOpen(newIndex);
                promise.then(()=>{
                    scope.imageIndex = scope.parent.imageIndex;
                    scope.init(scope.canvas);
                });
                scope.imageIndex = scope.parent.imageIndex;
                scope.parent.saveImageCsvServer();
            }

            angular.element(document).bind("keydown", function (event) {
                if((event.which === 13 && !($("button").is(":focus"))) || ((event.metaKey || event.ctrlKey) && event.which === 39)) {
                    scope.change(1);
                }
                else if((event.metaKey || event.ctrlKey) && event.which === 37){
                    scope.change(-1);
                }
                else if(event.which === 78){
                    if(!($("textarea").is(":focus"))){
                        scope.presentationCheckbox.checked = !scope.presentationCheckbox.checked;
                    }
                }
            });

            scope.saveCsv = () =>{
                scope.parent.saveImageCsvServer();
            }

            scope.backToList = () =>{
                scope.updateList();
                scope.parent.backToImageList();
            }

            scope.updateList = () => {
                let element = document.getElementsByClassName("rectangle");
                let bounding_box = {};
                if (element.length > 0){
                    bounding_box.x = Number(element[0].style.left.replace("px",''));
                    bounding_box.y = element[0].style.top.replace("px",'');
                    bounding_box.width = element[0].style.width.replace("px",'');
                    bounding_box.height = element[0].style.height.replace("px",'');
                    scope.parent.imagesCsv[scope.imageIndex].bounding_box = bounding_box;
                }
                else{
                    scope.parent.imagesCsv[scope.imageIndex].bounding_box = '';
                }
                scope.parent.imagesCsv[scope.imageIndex].predicted_title = scope.predictedTitle.value;
                scope.parent.imagesCsv[scope.imageIndex].presentation = !scope.presentationCheckbox.checked;
            }


            scope.init = (canvas) => {
                    scope.bgImg.src = scope.parent.imageSrc;
            }

            scope.bgImg = new Image();
            scope.bgImg.onload = () => {
                    scope.canvas.style.backgroundImage = 'url(' + scope.bgImg.src + ')';
                    scope.canvas.style.height = scope.bgImg.height + "px";
                    let prev = document.getElementsByClassName("rectangle");
                    if (prev.length > 0){
                        prev[0].remove();
                    }
                    scope.presentationCheckbox.checked = !scope.parent.imagesCsv[scope.imageIndex].presentation;
                    scope.predictedTitle.value = scope.parent.imagesCsv[scope.imageIndex].predicted_title;
                    if (scope.parent.imagesCsv[scope.imageIndex].bounding_box != ''){
                        let bounding_box = scope.parent.imagesCsv[scope.imageIndex].bounding_box
                        element = document.createElement('div');
                        element.className = 'rectangle'
                        element.style.left = bounding_box.x + 'px';
                        element.style.top = bounding_box.y + 'px';
                        element.style.width = bounding_box.width + 'px';
                        element.style.height = bounding_box.height + 'px';
                        canvas.appendChild(element);
                    }
                }

            scope.initDraw = (canvas) => {
                function setMousePosition(e) {
                    var ev = e || window.event; //Moz || IE
                    if (ev.pageX) { //Moz
                        mouse.x = ev.pageX + window.pageXOffset - boundingCanvas.x;
                        mouse.y = ev.pageY + window.pageYOffset - boundingContainer.y;
                    } else if (ev.clientX) { //IE
                        mouse.x = ev.clientX + document.body.scrollLeft - boundingCanvas.x;
                        mouse.y = ev.clientY + document.body.scrollTop - boundingContainer.y;
                    }
                };

                var boundingContainer = document.getElementById("container").getBoundingClientRect();
                var boundingCanvas = scope.canvas.getBoundingClientRect();
                var mouse = {
                    x: 0,
                    y: 0,
                    startX: 0,
                    startY: 0
                };
                var element = null;

                canvas.onmousemove = function (e) {
                    setMousePosition(e);
                    if (element !== null) {
                        element.style.width = Math.abs(mouse.x - mouse.startX) + 'px';
                        element.style.height = Math.abs(mouse.y - mouse.startY) + 'px';
                        element.style.left = (mouse.x - mouse.startX < 0) ? mouse.x + 'px' : mouse.startX + 'px';
                        element.style.top = (mouse.y - mouse.startY < 0) ? mouse.y + 'px' : mouse.startY + 'px';
                    }
                }

                canvas.onclick = function (e) {
                    if (element !== null) {
                        element = null;
                        canvas.style.cursor = "default";
                    } else {
                        let prev = document.getElementsByClassName("rectangle");
                        if (prev.length > 0){
                            prev[0].remove();
                        }

                        mouse.startX = mouse.x;
                        mouse.startY = mouse.y;
                        element = document.createElement('div');
                        element.className = 'rectangle'
                        element.style.left = mouse.x + 'px';
                        element.style.top = mouse.y + 'px';
                        canvas.appendChild(element)
                        canvas.style.cursor = "crosshair";
                    }
                }
            }

            scope.deleteBoundingBox = () => {
                let prev = document.getElementsByClassName("rectangle");
                if (prev.length > 0){
                    prev[0].remove();
                }
            }

            scope.init(scope.canvas);
            scope.initDraw(scope.canvas);

            angular.extend(scope.parent, {
                saveImageCsvLocal: function(){
                    scope.updateList();
                }
             });
        }
    }
}