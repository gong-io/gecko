const imageTableTemplate = require('ngtemplate-loader?requireAngular!html-loader!../templates/imageTable.html')

export const imageTableDirective = () => {
    return {
        restrict: "E",
        scope: {
            'parent': '='
        },
        templateUrl: imageTableTemplate,
        link: (scope, element, attrs) => {
//            scope.imgSrc;
            scope.clickPath = (index) =>{
                scope.parent.imageOpen(index);
            }

//
//            scope.$watch(() => scope.parent.imageSrc,
//            (newVal)=>{
//                if (newVal){
//                    scope.imgSrc = newVal;
//                }
//            })
//
//            scope.$watch(() => scope.parent.currentTimeSeconds,
//                (newVal) => {
//                    if (newVal) {
//                        scope.sliderModel = newVal
//                    }
//            })
//
//            scope.changeProgress = (e) => {
//                scope.parent.seek(scope.sliderModel)
//            }
//
//            scope.playPause = () => {
//                scope.parent.playPause()
//            }
        }
    }
}