var config = {
    wavesurfer: {
        container: '#waveform',
        waveColor: 'black',
        // waveColor == progressColor => no progress painting
        // progressColor: 'black',
        pixelRatio: 1,
        autoCenter : true,
        autoCenterImmediately: true,
        height: '350',
        useSpectrogram: true,
        scrollParent: true,
        responsive: true
    },
    parserOptions: {
        srt: {
            groupWords: true
        }
    },
    slider: "#slider",
    saveMode: 0,
    proofreadingAutoScroll: false,
    enableDrafts: false,
    emptySectionClick: true
}

export { config }