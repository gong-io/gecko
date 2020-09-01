import { discrepancies } from '../utils'

const comparsionTemplate = require('ngtemplate-loader?requireAngular!html-loader!../templates/comparsion.html')

export const comparsionDirective = (discrepancyService) => {
    return {
        restrict: 'E',
        templateUrl: comparsionTemplate,
        scope: {
            parent: '=',
            discrepancies: '='
        },
        link: (scope) => {
            scope.jumpNextDiscrepancy = () => {
                discrepancyService.jumpNextDiscrepancy(scope, scope.parent)
            }

            scope.jumpPreviousDiscrepancy = () => {
                discrepancyService.jumpPreviousDiscrepancy(scope, scope.parent)
            }

            scope.playDiscrepancy = (discrepancy) => {
                discrepancyService.playDiscrepancy(scope.parent, discrepancy)
            }

            scope.parent.comparsion = scope

            scope.updateSelectedDiscrepancy = () => {
                discrepancyService.updateSelectedDiscrepancy(scope, scope.parent)
            }

            scope.discrepancyToCSV = () => {
                return discrepancyService.toCSV(scope.parent)
            }
        } 
    }
}