const shortcutsInfoTemplate = require('ngtemplate-loader?requireAngular!html-loader!../templates/shortcutsInfo.html')

export default (parent) => {
    return {
        templateUrl: shortcutsInfoTemplate,
        controller: ($scope, $uibModalInstance) => {
            $scope.ok = () => {
                $uibModalInstance.close();
            };
            $scope.shortcuts = parent.shortcuts.getInfo()
        }
    }
}