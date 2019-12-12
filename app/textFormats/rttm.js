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

    return monologues;
}

export const convert = (app, fileIndex) => {
    var self = app;
    var data = [];

    app.iterateRegions(function (region) {
        data.push('SPEAKER <NA> <NA> {0} {1} <NA> <NA> {2} <NA> <NA>'.format(
            region.start.toFixed(2),
            (region.end - region.start).toFixed(2),
            self.formatSpeaker(region.data.speaker)));
    }, fileIndex, true);

    return data.join('\n');
}