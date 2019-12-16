export default () => {
    return {
        scope: {
            fileread: "=",
            afterread: '&?',
            handlemultiple: '&?'
        },
        link: (scope, element, attributes) => {
            element.bind('change', (changeEvent) => {
                scope.$apply(() => {
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
                        scope.$$postDigest(() => {
                            scope.afterread();
                        });
                    }
                    // or all selected files:
                    // scope.fileread = changeEvent.target.files;
                });
            });
        }
    }
}