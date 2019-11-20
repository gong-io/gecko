const shortcutsInfoTemplate = require('ngtemplate-loader?requireAngular!html-loader!../static/templates/shortcutsInfo.html')

export default (parent) => {
    return {
        templateUrl: shortcutsInfoTemplate,
        controller: function ($scope, $uibModalInstance) {
            $scope.ok = function () {
                $uibModalInstance.close();
            };
            $scope.shortcuts = parent.shortcuts.getInfo()
        }
    }
}