export const parse = (data) => {
    var monologues = [];
    var lines = data.split(/\r|\n/);
    for (var i = 0; i < lines.length; i++) {
        if (lines[i] === "") continue;
        var cells = lines[i].split('\t');

        var speaker = cells[2];
        var start = parseFloat(cells[0]);
        var end = parseFloat(cells[1]);
        monologues.push({speaker: {id: speaker}, start: start, end: end, words: []});

    }

    return monologues;
}