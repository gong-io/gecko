class dataManager {
    constructor($http, $q) {
        this.$http = $http;
        this.$q = $q;
    }

    downloadFileToClient(data, filename) {
        var blob = new Blob([data], {type: 'text/json'});
        var e = document.createEvent('MouseEvents');
        var a = document.createElement('a');

        a.download = filename;
        a.href = window.URL.createObjectURL(blob);
        a.dataset.downloadurl = ['text/json', a.download, a.href].join(':');
        e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
        a.dispatchEvent(e);
    }

    saveDataToServer(data, call_id) {

    }

    loadFileFromServer(config) {
        return this.serverRequest(config);
        //TODO: change to an actual ONE server request containing all the data same as in the "res" object.
    }

    serverRequest(config) {
        let promises = [];

        let res = {segmentFiles: []}

        promises.push(this.$http({
            method: 'GET',
            url: config.audio.url,
            responseType: 'blob',
            headers: {
                'Access-Control-Allow-Origin': true
            }
        }).then(function successCallback(response) {

            res.audioFile = response.data;
            res.audioFileName = config.audio.fileName;

        }, function errorCallback(response) {
            // called asynchronously if an error occurs
            // or server returns response with an error status.
        }));

        config.ctms.forEach((ctm) => {
            promises.push(this.$http({
                method: 'GET',
                url: ctm.url
            }).then(function (response) {
                res.segmentFiles.push({
                    filename: ctm.fileName,
                    data: response.data,
                    headers: {
                        'Access-Control-Allow-Origin': true
                    }
                });
            }))
        })


        return this.$q.all(promises).then(function () {
            return res;
        });
    }
}


dataManager.$inject = ['$http', '$q'];
export {dataManager}