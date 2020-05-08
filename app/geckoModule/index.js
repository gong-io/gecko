import angular from 'angular'

import dropdown from 'angular-ui-bootstrap/src/dropdown'
import modal from 'angular-ui-bootstrap/src/modal'
import collapse from 'angular-ui-bootstrap/src/collapse'
import tooltip from 'angular-ui-bootstrap/src/tooltip'

import toaster from 'angularjs-toaster/index'

import { MainController } from './controller.js'

import {
    EventBus,
    dataManager,
    dataBase,
    DiscrepancyService,
    HistoryService,
    Debounce
} from './services'

import { 
    editableWordsDirective,
    proofReadingViewDirective,
    playPartDirective,
    miniPlayerDirective,
    editableDirective,
    Checklist,
    fileRead,
    contextMenu
} from './directives'

import { 
    mulSearch,
    speakersFilter,
    speakersFilterColor,
    toTrusted,
    toMMSS,
    secondsToFixed
} from './filters'

const geckoModule = angular.module('gecko', [ dropdown, modal, collapse, tooltip, toaster ])

geckoModule.controller('MainController', MainController);

geckoModule.service('eventBus', ['$timeout', EventBus])
geckoModule.service('discrepancyService', DiscrepancyService)
geckoModule.service('historyService', HistoryService)
geckoModule.service('dataManager', dataManager)
geckoModule.service('dataBase', dataBase)
geckoModule.service('debounceService', ['$timeout', '$q', Debounce])

geckoModule.directive('editableWords', ['$timeout', 'eventBus', editableWordsDirective])
geckoModule.directive('proofReadingView', ['$timeout', 'eventBus', proofReadingViewDirective])
geckoModule.directive('editable', editableDirective)
geckoModule.directive('playPart', playPartDirective)
geckoModule.directive('miniPlayer', miniPlayerDirective)
geckoModule.directive('checklistModel', Checklist)
geckoModule.directive('fileread', fileRead)
geckoModule.directive('contextMenu', ['$timeout', contextMenu])

geckoModule.filter('mulSearch', mulSearch)
geckoModule.filter('speakersFilter', speakersFilter)
geckoModule.filter('speakersFilterColor', speakersFilterColor)
geckoModule.filter('to_trusted', ['$sce', toTrusted])
geckoModule.filter('toMMSS', toMMSS)
geckoModule.filter('secondsToFixed', secondsToFixed)


export default geckoModule
