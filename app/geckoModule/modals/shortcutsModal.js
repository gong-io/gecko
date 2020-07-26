const shortcutsInfoTemplate = require('ngtemplate-loader?requireAngular!html-loader!../templates/shortcutsInfo.html')

export default (parent) => {
    const modal = {
        templateUrl: shortcutsInfoTemplate,
        controller: ($scope, $uibModalInstance) => {
            $scope.ok = () => {
                $uibModalInstance.close();
            };
            $scope.shortcuts = parent.shortcuts.getInfo()
        }
    }

    modal.controller.$inject = ['$scope', '$uibModalInstance']

    return modal
}