var config = {
    wavesurfer: {
        container: '#waveform',
        waveColor: 'black',
        // waveColor == progressColor => no progress painting
        // progressColor: 'black',
        pixelRatio: 1,
        autoCenter : false,
        height: '350',
        useSpectrogram: false,
        scrollParent: true
    },
    parserOptions: {
        srt: {
            groupWords: true
        }
    },
    slider: "#slider",
    isServerMode: false
}

export { config }