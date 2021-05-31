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
            scope.parent.indexes = [];
            scope.only_done = true;
            scope.clickPath = (index) =>{
                scope.parent.imageOpen(index);
            }

            scope.changeSearch = () =>{
                scope.parent.indexes = [];
            }

            scope.test = (imageLine,index)=>{
                if(scope.search){
                    if(imageLine.predicted_title.includes(scope.search)){
                        scope.parent.indexes.push(index);
                        return true;
                    }
                    return false;
                }
                else if(scope.only_done){
                    if(imageLine.predicted_title != '' || !imageLine.presentation){
                        return false;
                    }
                    scope.parent.indexes.push(index);
                    return true;
                }
                else{
                    scope.parent.indexes.push(index);
                    return true;
                }
            }

        }
    }
}