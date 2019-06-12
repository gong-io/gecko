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

    loadFileFromServer(call_id) {
        return this._fakeServerRequest();
        //TODO: change to an actual ONE server request containing all the data same as in the "res" object.
    }

    _fakeServerRequest() {
        let promises = [];

        let res = {segmentFiles: []}

        promises.push(this.$http({
            method: 'GET',
            url: 'http://127.0.0.1:8000/data/temp/audio/1853674366752009473.wav',
            responseType: 'blob'
        }).then(function successCallback(response) {

            res.audioFile = response.data;
            res.audioFileName = "123.wav";

        }, function errorCallback(response) {
            // called asynchronously if an error occurs
            // or server returns response with an error status.
        }));

        promises.push(this.$http({
            method: 'GET',
            url: 'http://127.0.0.1:8000/data/temp/root/human/1853674366752009473_old.ctm'
        }).then(function (response) {
            res.segmentFiles.push({
                filename: "old.ctm",
                data: response.data
            });
        }));

        promises.push(this.$http({
            method: 'GET',
            url: 'http://127.0.0.1:8000/data/temp/root/machine/1853674366752009473_new.ctm'
        }).then(function (response) {
            res.segmentFiles.push({
                filename: "new.ctm",
                data: response.data
            });
        }));


        return this.$q.all(promises).then(function () {
            return res;
        });
    }
}


dataManager.$inject = ['$http', '$q'];
export {dataManager}