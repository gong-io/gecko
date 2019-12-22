import videojs from 'video.js'

export const readTextFile = (context, file, cb) => {
    // check for empty file object
    if (Object.keys(file).length === 0 && file.constructor === Object) {
        cb(undefined)
        return;
    }
    var reader = new FileReader()

    reader.onload = (e) => {
        const result = context.handleTextFormats(file.name, e.target.result)
        cb(result)
    };

    reader.readAsText(file)
}

export const readAudioFile = (file) => {
    return new Promise((resolve, reject) => {
        resolve(file)
    })
}

export const readVideoFile = (context, file) => {
    return new Promise(async (resolve, reject) => {
        context.audioFileName = file.name;
        var reader = new FileReader();
        const audioContext = new (window.AudioContext || window.webkitAudioContext)()
        reader.onload = () => {
            var videoFileAsBuffer = reader.result
            audioContext.decodeAudioData(videoFileAsBuffer).then((decodedAudioData) => {
                context.videoMode = true
                resolve(decodedAudioData)
            })
        }
        reader.readAsArrayBuffer(file)
    })
}

export const readMediaFile = async (context, file) => {
    return new Promise(async (resolve, reject) => {
        context.audioFileName = file.name;
        if (file.type.includes('audio')) {
            const result = await readAudioFile(file)
            resolve(result)
        } else if (file.type.includes('video')) {
            const result = await readVideoFile(context, file)
            resolve(result)
        }
    })
}

export const parseAndLoadText = (context, res) => {
    context.filesData = []

    var i = 0;

    // force recursion in order to keep the order of the files
    const cb = async (data) => {
        const parsedData = Array.isArray(data) ? data[0] : data
        const parsedColors = Array.isArray(data) && data.length > 1 ? data[1] : null
        const file = { filename: res.segmentsFiles[i].name, data: parsedData }
        context.filesData.push(file);
        context.fileSpeakerColors = parsedColors
        await context.dataBase.addFile({
            fileName: file.filename,
            fileData: file.data
        })
        i++;
        if (i < res.segmentsFiles.length) {
            readTextFile(context, res.segmentsFiles[i], cb);
        }
    }

    if (i < res.segmentsFiles.length) {
        readTextFile(context, res.segmentsFiles[i], cb);
    } else {
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
}

export const parseAndLoadAudio = async (context, res) => {
    if (res.call_from_url) {
        context.audioFileName = res.call_from_url.id;
        context.wavesurfer.load(res.call_from_url.url);
        parseAndLoadText(context, res);
    } else {
        const fileResult = await readMediaFile(context, res.audio)
        parseAndLoadText(context, res);
        await context.dataBase.clearDB()
        if (!context.videoMode) {
            context.dataBase.addMediaFile({
                fileName: context.audioFileName,
                fileData: fileResult
            })
            try {
                context.wavesurfer.loadBlob(fileResult);
            } catch (e) {
                console.log('error', e)
            }
        } else {
            context.dataBase.addMediaFile({
                fileName: context.audioFileName,
                fileData: res.audio,
                isVideo: true
            })
            context.videoPlayer = videojs('video-js')
            context.videoPlayer.ready(() => {
                const fileUrl = URL.createObjectURL(res.audio);
                const fileType = res.audio.type;
                context.videoPlayer.src({ type: fileType, src: fileUrl });
                context.videoPlayer.load();
                context.videoPlayer.muted(true)
            })
            context.wavesurfer.loadDecodedBuffer(fileResult);
        }
    }
}