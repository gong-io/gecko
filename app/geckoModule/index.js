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
    Debounce,
    Store
} from './services'

import { 
    editableWordsDirective,
    proofReadingViewDirective,
    playPartDirective,
    miniPlayerDirective,
    imageViewDirective,
    imageTableDirective,
    editableDirective,
    searchBarDirective,
    Checklist,
    fileRead,
    contextMenu,
    comparsionDirective
} from './directives'

import { 
    mulSearch,
    speakersFilter,
    speakersFilterColor,
    toTrusted,
    toMMSS,
    secondsToFixed,
    secondsToMinutes
} from './filters'

const geckoModule = angular.module('gecko', [ dropdown, modal, collapse, tooltip, toaster ])

geckoModule.controller('MainController', MainController);

geckoModule.service('eventBus', ['$timeout', EventBus])
geckoModule.service('debounce', ['$timeout', '$q', Debounce])
geckoModule.service('store', Store)
geckoModule.service('discrepancyService', DiscrepancyService)
geckoModule.service('historyService', HistoryService)
geckoModule.service('dataManager', dataManager)
geckoModule.service('dataBase', dataBase)

geckoModule.directive('editableWords', ['$timeout', 'eventBus', 'store', editableWordsDirective])
geckoModule.directive('proofReadingView', ['$timeout', 'eventBus', 'store', proofReadingViewDirective])
geckoModule.directive('editable', editableDirective)
geckoModule.directive('playPart', ['store', playPartDirective])
geckoModule.directive('miniPlayer', miniPlayerDirective)
geckoModule.directive('imageView', imageViewDirective)
geckoModule.directive('imageTable', imageTableDirective)
geckoModule.directive('searchBar', searchBarDirective)
geckoModule.directive('checklistModel', Checklist)
geckoModule.directive('fileread', fileRead)
geckoModule.directive('comparsion', ['discrepancyService', comparsionDirective])
geckoModule.directive('contextMenu', ['$timeout', contextMenu])

geckoModule.filter('mulSearch', mulSearch)
geckoModule.filter('speakersFilter', speakersFilter)
geckoModule.filter('speakersFilterColor', speakersFilterColor)
geckoModule.filter('to_trusted', ['$sce', toTrusted])
geckoModule.filter('toMMSS', toMMSS)
geckoModule.filter('secondsToFixed', secondsToFixed)
geckoModule.filter('secondsToMinutes', secondsToMinutes)

export default geckoModule
