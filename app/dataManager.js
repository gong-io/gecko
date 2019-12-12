import Swal from 'sweetalert2'

class dataManager {
    constructor($http, $q) {
        this.$http = $http;
        this.$q = $q;
    }

    isS3Enabled () {
        return process.env.GECKO_APP_HOST && process.env.GECKO_APP_HOST.length && process.env.GECKO_SERVER_HOST_PORT && process.env.GECKO_SERVER_HOST_PORT.length 
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

    async saveDataToServer(data, { filename, s3Subfolder }) {
        const spl = filename.split('.')
        const ext = spl.pop()
        const d = new Date()
        const datestring = d.getFullYear() + ('0'+(d.getMonth()+1)).slice(-2) + ('0' + d.getDate()).slice(-2) + '-' + ('0' + d.getHours()).slice(-2) + ('0' + d.getMinutes()).slice(-2)
        let timestampedS3Filename = `${spl.join('.')}_${datestring}.${ext}`
        let s3Filename = filename
        if (s3Subfolder) {
            timestampedS3Filename = `${s3Subfolder}/${timestampedS3Filename}`
            s3Filename = `${s3Subfolder}/${filename}`
        }

        try {
            const resp = await this.$http({
                method: 'POST',
                url:  '/upload_s3',
                headers: {
                    'Access-Control-Allow-Origin': true
                },
                data: {
                    filename: timestampedS3Filename,
                    data
                }
            })
    
            if (resp.data && resp.data.OK) {
                const respSecond = await this.$http({
                    method: 'POST',
                    url:  '/upload_s3',
                    headers: {
                        'Access-Control-Allow-Origin': true
                    },
                    data: {
                        filename: s3Filename,
                        data
                    }
                })
                if (respSecond.data && respSecond.data.OK) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Success',
                        text: `File ${timestampedS3Filename} successefully uploaded`
                    })
                }
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Upload error',
                    text: resp.data.error
                })
            }
        } catch (e) {
            Swal.fire({
                icon: 'error',
                title: 'Upload error',
                text: e.statusText
            })
        }
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
            responseType: 'blob'
        }).then(function successCallback(response) {

            res.audioFile = response.data;
            res.audioFileName = config.audio.fileName;

        }, function errorCallback(response) {
            // called asynchronously if an error occurs
            // or server returns response with an error status.
        }));

        config.ctms.forEach((ctm) => {
            let ctmSubfolder = null
            /* for s3 proxy */
            if (ctm.url.includes('s3_files')) {
                const splFiles = ctm.url.split('/s3_files/')
                if (splFiles.length > 1) {
                    const s3Path = splFiles[1]
                    const splS3Path = s3Path.split('/')
                    ctmSubfolder = splS3Path.slice(0, splS3Path.length - 1).join('/')
                }
            }
            promises.push(this.$http({
                method: 'GET',
                url: ctm.url
            }).then(function (response) {
                const addedFile = {
                    filename: ctm.fileName,
                    data: response.data,
                    headers: {
                        'Access-Control-Allow-Origin': true
                    }
                }
                if (ctmSubfolder) {
                    addedFile.s3Subfolder = ctmSubfolder
                }
                res.segmentFiles.push(addedFile);
            }))
        })


        return this.$q.all(promises).then(function () {
            return res;
        });
    }
}


dataManager.$inject = ['$http', '$q'];
export {dataManager}