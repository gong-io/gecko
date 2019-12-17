import angular from 'angular'
import 'video.js/dist/video-js.min.css'

import '../static/css/bootstrap.min.theme_paper.css'
import '../static/css/app.css'
import '../static/js/bootstrap.min.js'

import geckoModule from './geckoModule'

var speechRecognition = angular.module('speechRecognition', [geckoModule.name])

speechRecognition.config(($httpProvider) => {
    //Enable cross domain calls
    $httpProvider.defaults.useXDomain = true
})
