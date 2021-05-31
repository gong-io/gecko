import videojs from 'video.js'

import { getCurrentTimeStamp, formatTime } from './index.js'

const CSV = require('csv-string')

export const readTextFile = (file) => {
    return new Promise((resolve) => {
        // check for empty file object
        if (Object.keys(file).length === 0 && file.constructor === Object) {
            resolve(undefined)
            return;
        }
        var reader = new FileReader()

        reader.onload = (e) => {
            // cb(e.target.result)
            resolve({ data: e.target.result, name: file.name })
        };

        reader.readAsText(file)
    })
}

export const readAudioFile = (file) => {
    return new Promise((resolve) => {
        resolve(file)
    })
}

export const readVideoFile = (context, file) => {
    return new Promise(async (resolve) => {
        context.audioFileName = file.name;
        var reader = new FileReader();
        const audioContext = new (window.AudioContext || window.webkitAudioContext)()
        reader.onload = () => {
            var videoFileAsBuffer = reader.result
            audioContext.decodeAudioData(videoFileAsBuffer).then((decodedAudioData) => {
                resolve(decodedAudioData)
            })
        }
        reader.readAsArrayBuffer(file)
    })
}

export const readMediaFile = async (context, file) => {
    return new Promise(async (resolve) => {
        context.audioFileName = file.name;
        if (file.type.includes('audio')) {
            const result = await readAudioFile(file)
            resolve(result)
        } else if (file.type.includes('video')) {
            context.videoMode = true
            const result = await readVideoFile(context, file)
            resolve(result)
        }
    })
}

const addEmptyFile = (context) => {
    var filename = context.audioFileName.substr(0, context.audioFileName.lastIndexOf('.')) + ".txt";
    if (filename === ".txt") {
        filename = context.audioFileName + ".txt";
    }
    context.filesData.push(
        {
            filename: filename,
            data: []
        }
    );
}

export const parseServerResponse = (context, serverConfig, res) => {
    context.filesData = []
    context.wavesurfer.loadBlob(res.audioFile)

    const urlArr = serverConfig.audio.url.split('/')
    const audioFileName = urlArr[urlArr.length - 1]
    context.audioFileName = audioFileName.split('?')[0]

    if (res.segmentFiles.length) {
        res.segmentFiles.forEach((x) => {
            parseFileData(context, x.filename, x.data, x.s3Subfolder)
        })
    } else {
        addEmptyFile(context)
    }
}

const parseFileData = (context, fileName, fileData, fileS3Subfolder = null) => {
    const fileNameClean = fileName.split('?')[0]
    const data = context.handleTextFormats(fileNameClean, fileData)
    const parsedData = Array.isArray(data) ? data[0] : data
    const parsedColors = Array.isArray(data) && data.length > 1 ? data[1] : null
    const file = { filename: fileNameClean, fullFilename: fileName, data: parsedData }
    if (fileS3Subfolder) {
        file.s3Subfolder = fileS3Subfolder
    }
    context.filesData.push(file)
    context.fileSpeakerColors = parsedColors
}

export const parseAndLoadText = async (context, res) => {
    context.filesData = []

    return new Promise(async (resolve) => {
        const promises = res.segmentsFiles.map(async (f) => await readTextFile(f))

        if (!promises.length) {
            addEmptyFile(context)
            resolve()
        }

        const results = await Promise.all(promises)
        results.forEach(r => {
            if (r) {
                parseFileData(context, r.name, r.data)
            }
        })
        resolve()
    })
}

export const parseAndLoadAudio = async (context, res) => {
    if (res.call_from_url) {
        self.audioFileName = res.call_from_url.id;
        self.wavesurfer.load(res.call_from_url.url);
        parseAndLoadText(context, res);
    } else {
        context.loader = true
        const fileResult = await readMediaFile(context, res.audio)
        await parseAndLoadText(context, res)
        let mediaFile
        if (!context.videoMode) {
            mediaFile = {
                name: context.audioFileName,
                data: fileResult,
                url: null
            }
            try {
                context.wavesurfer.loadBlob(fileResult);
            } catch (e) {
                console.log('error', e)
            }
        } else {
            mediaFile = {
                name: context.audioFileName,
                data: res.audio,
                isVideo: true,
                url: null
            }
            context.videoPlayer = videojs('video-js')
            context.videoPlayer.ready(function () {
                var fileUrl = URL.createObjectURL(res.audio);
                var fileType = res.audio.type;
                this.src({ type: fileType, src: fileUrl });
                this.load();
                this.muted(true)
            })
            context.wavesurfer.loadDecodedBuffer(fileResult);
        }

        if (context.dataBase) {
            const draft = await context.dataBase.createDraft({
                mediaFile,
                files: context.filesData,
                timeStamp: getCurrentTimeStamp(),
                draftType: 0
            })
            context.currentDraftId = draft
            context.lastDraft = formatTime(new Date())
        }
    }
}


export const parseImageCsv = async (context, res) => {
    let parsedCSV = CSV.parse(res.data);

//    let fileData = res.data.split('\n');
    var keys = parsedCSV[0];
    context.imagesCsv = []
    for (let i = 1 ; i < parsedCSV.length; i++){
        let data = {}
        let values = parsedCSV[i];

        for (let keyIndex = 0 ; keyIndex < keys.length; keyIndex++){
            if (!data[keys[keyIndex]]){
                let key = keys[keyIndex].trim();
                if (key === 'presentation'){
                    key = "computer_classification"
                    data[key] = 'presentation';
                    key = "human_classification"
                    data[key] = values[keyIndex] == 'true' ? 'presentation' : '';
                }
                else if (key.includes('classification')){
                    data[key] = values[keyIndex];
                }
                else if (key === 'bounding_box' && values[keyIndex]){
                    let bounding_box = values[keyIndex].substring(1, values[keyIndex].length - 1);
                    bounding_box = bounding_box.split(',');
                    if(bounding_box.length == 4){
                        if (bounding_box[0].includes("("))
                            bounding_box[0] = bounding_box[0].substring(1);
                        if (bounding_box[3].includes(")"))
                            bounding_box[3] = bounding_box[3].substring(0,values[keyIndex].length - 1);
                        data[key] = {x: bounding_box[0], y: bounding_box[1], width: bounding_box[2], height: bounding_box[3]};
                    }
                    else
                        data[key] = '';
                }
                else
                    data[key] = values[keyIndex];
            }
        }
        context.imagesCsv.push(data);
    }
}

export const combineImageCsv = async (context, data) => {
    return new Promise(resolve => {
        let f = [Object.keys(data[0])];
        f[0].pop("$$hashKey")
//        context.outputImagesCsv = "file_path\tpredicted_title\tbounding_box\tpresentation\t";
        for(let i = 0; i < data.length; i++){
            let bounding_box = '';
             if (data[i].bounding_box && data[i].bounding_box != '' && 'x' in data[i].bounding_box && 'y' in data[i].bounding_box && 'width' in data[i].bounding_box && 'height' in data[i].bounding_box)
                bounding_box = `(${data[i].bounding_box.x},${data[i].bounding_box.y},${data[i].bounding_box.width},${data[i].bounding_box.height})`;
             var arr = [];
             for (let j = 0; j < f[0].length; j++){
                if (f[0][j] === "bounding_box")
                    arr.push(bounding_box);
                else
                    arr.push(data[i][f[0][j]]);
             }
             f.push(arr);
//            context.outputImagesCsv += `\n${data[i].file_path}\t${data[i].predicted_title}\t${bounding_box}\t${data[i].presentation}\t`;
        }
        context.outputImagesCsv = CSV.stringify(f)
        resolve();
    });
}

