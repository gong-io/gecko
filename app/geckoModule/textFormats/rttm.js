export const parse = (data) => {
    var monologues = [];

    var lines = data.split(/\r|\n/);
    for (var i = 0; i < lines.length; i++) {
        if (lines[i] === "") continue;

        var cells = lines[i].match(/\S+/g);
        var speaker = cells[7];
        var start = parseFloat(cells[3]);
        var duration = parseFloat(cells[4]);
        var end = start + duration;

        monologues.push({speaker: {id: speaker}, start: start, end: end, words: []});
    }

    return [ monologues ];
}

export const convert = (app, fileIndex) => {
    var self = app;
    var data = [];

    app.iterateRegions((region) => {
        data.push(`SPEAKER <NA> <NA> ${region.start.toFixed(2)} ${(region.end - region.start).toFixed(2)} <NA> <NA> ${self.formatSpeaker(region.data.speaker)} <NA> <NA>`)
    }, fileIndex, true);

    return data.join('\n');
}