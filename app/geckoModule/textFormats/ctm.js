import * as constants from '../constants'

export const parse = (data, $parent) => {
    let monologues = [];

    let lines = data.split(/\r|\n/);
    let words = lines.filter((line) => {
        return line !== '';
    }).map((line) => {
        let cells = line.match(/\S+/g);

        let start = parseFloat(cells[2]);
        let duration = parseFloat(cells[3]);
        let end = start + duration;
        let confidence = parseFloat(cells[5])
        if (confidence === constants.NO_CONFIDENCE) {
            confidence = undefined;
        }

        const text = cells[4] !== constants.EMPTY_TEXT ? cells[4] : ''
 
        return {
            speaker: {id: cells[0].split('_')[0]},
            segment_id: parseInt(cells[0].split('_')[1]),
            start: start,
            end: end,
            text,
            confidence: confidence
        }
    });


    let lastMonologue = -1;

    words.sort((x, y) => {
        if (x.start >= y.start) {
            return 1;
        }

        return -1;
    })

    words.forEach((word) => {
        if (word.segment_id !== lastMonologue) {
            lastMonologue = word.segment_id;
            let speaker = word.speaker;

            monologues.push({
                speaker: word.speaker,
                start: word.start,
                words: [word]
            });
        } else {
            monologues[monologues.length - 1].words.push(word);
        }

        // this information is now on the segment/monologue
        delete word.segment_id;
        delete word.speaker;
    });

    monologues.forEach((m) => {
        let lastWord = m.words[m.words.length - 1];
        m.end = lastWord.end;
    });

    $parent.ctmData.push(words);

    return [ monologues ];
}

export const convert = (app, fileIndex) => {
    var self = app;
    var segment_id = 0;
    const output = []

    app.iterateRegions((region) => {
        let speaker = self.formatSpeaker(region.data.speaker);

        region.data.words.forEach((word) => {
            let confidence = word.confidence || constants.NO_CONFIDENCE;
            output.push(`${speaker}_${segment_id.toString().padStart(5, '0')}_audio 1 ${word.start.toFixed(2).padStart(8, '0')} ${(word.end - word.start).toFixed(2)} ${word.text.length ? word.text : constants.EMPTY_TEXT} ${confidence.toFixed(2)}`)
        });

        segment_id++;
    }, fileIndex, true);

    return output.sort().join('\n')
}