const miniPlayerTemplate = require('ngtemplate-loader?requireAngular!html-loader!../templates/miniPlayer.html')

export const miniPlayerDirective = () => {
    return {
        replace: true,
        restrict: "E",
        scope: {
            'parent': '='
        },
        templateUrl: miniPlayerTemplate,
        link: (scope, element, attrs) => {
            scope.sliderModel = 0

            scope.$watch(() => scope.parent.ready,
                (newVal) => {
                    if (newVal) {
                        scope.total = scope.parent.wavesurfer.getDuration()
                    }
            })

            scope.$watch(() => scope.parent.currentTimeSeconds,
                (newVal) => {
                    if (newVal) {
                        scope.sliderModel = newVal
                    }
            })

            scope.changeProgress = (e) => {
                scope.parent.seek(scope.sliderModel)
            }

            scope.playPause = () => {
                scope.parent.playPause()
            }
        }
    }
}