import {
    secondsToMinutes
} from '../utils'

const noSpeakerWarningTemplate = require('ngtemplate-loader?requireAngular!html-loader!../templates/noSpeakerWarning.html')

export default (regions, fileData) => {
    const modal = {
        templateUrl: noSpeakerWarningTemplate,
        controller: ($scope, $uibModalInstance) => {
            $scope.fileData = fileData
            $scope.regions = regions
            $scope.ok = () => {
                $uibModalInstance.close(true)
            };

            $scope.cancel = () => {
                $uibModalInstance.close(false)
            }

            $scope.regionsString = regions.map(r => `${secondsToMinutes(r.start)}-${secondsToMinutes(r.end)}`).join(', ')
        }
    }

    modal.controller.$inject = ['$scope', '$uibModalInstance']

    return modal
}