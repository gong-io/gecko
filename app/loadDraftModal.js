
import { formatDate } from './utils'
const loadDraftModalTemplate = require('ngtemplate-loader?requireAngular!html-loader!../static/templates/loadDraftModal.html')

export default (parent, drafts) => {
    return {
        templateUrl: loadDraftModalTemplate,
        backdrop: 'static',
        controller: async ($scope, $uibModalInstance, $timeout) => {
            $timeout(() => {
                $scope.drafts = drafts.sort((a, b) => {
                    if (a.mtime > b.mtime) {
                        return -1
                    } else if (a.mtime < b.mtime) {
                        return 1
                    }
    
                    return 0
                }).map(d => {
                    return {
                        mediaFileName: d.mediaFile.name,
                        fileNames: d.files.map(f => f.filename).join(', '),
                        lastModified: formatDate(new Date(d.mtime)),
                        id: d.id
                    }
                })
            })

            $scope.deleteDraft = async (id) => {
                const idx = $scope.drafts.findIndex(d => d.id === id)
                $scope.drafts.splice(idx, 1)
                await parent.dataBase.deleteDraft(id)
            }

            $scope.selectDraft = (d) => {
                $uibModalInstance.close(d)
            }

            $scope.loadLast = () => {
                const last = $scope.drafts[0]
                $uibModalInstance.close(last)
            }

            $scope.cancel = () => {
                $uibModalInstance.close()
            }
        }
    }
}