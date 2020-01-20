import { EMPTY_TEXT } from '../constants'

export const parse = (data, $parent, parserOptions) => {
    const options = parserOptions.srt

    let monologues = [];

    const lines = data.split(/\r|\n/);
    
    let acc = []
    const blocks = [] 
    const lLength = lines.length
    for (let i = 0; i < lLength; i++) {
        if (lines[i] !== '') {
            acc.push(lines[i])
        } else {
            blocks.push(acc)
            acc = []
        }
    }
    const HMSToSeconds = (str) => {
        const spl = str.split(',')
        const hms = spl[0]
        const a = hms.split(':')
        const seconds = (+a[0]) * 60 * 60 + (+a[1]) * 60 + (+a[2])
        const frac = parseFloat(`0.${spl[1]}`)
        return seconds + frac
    }
    let words = blocks.filter((block) => block.length).map((block) => {
        const ret = {}
        const timeStr = block[1]
        if (block.length === 4) {
            ret.text = block[3] !== EMPTY_TEXT ? block[3] : ''
            const idStr = block[2].replace('(', '').replace(')', '')
            const spl = idStr.split('_')
            ret.speaker = { id: spl[0] }
            ret.segment_id = spl[1]
        } else {
            ret.text = block[2] !== EMPTY_TEXT ? block[2] : ''
            ret.speaker = { id: '' }
        }

        const splTimeStr = timeStr.split('-->').map(s => s.trim())
        ret.start = HMSToSeconds(splTimeStr[0])
        ret.end = HMSToSeconds(splTimeStr[1])

        return ret
    });

    let lastMonologue = -1;

    if (!options || !options.groupWords) {
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
            delete word.segment_id;
            delete word.speaker;
        });

        monologues.forEach((m) => {
            let lastWord = m.words[m.words.length - 1];
            m.end = lastWord.end;
        });
    } else {
        words.forEach((word) => {
            const { speaker, start, end, text } = word
            const wordsArrText = text.split(' ')
            const rWords = wordsArrText.map((t) => {
                return {
                    text: t,
                    speaker,
                    start,
                    end
                }
            })
            monologues.push({
                speaker: word.speaker,
                start: word.start,
                end: word.end,
                words: rWords
            });
        })
    }

    $parent.ctmData.push(words);

    return [ monologues ];
}

export const convert = (app, fileIndex, parserOptions) => {
    var self = app;
    var segment_id = 1;
    var region_id = 0;
    const output = []
    const options = parserOptions.srt

    const toHHMMSS = (seconds) => {
        return new Date(seconds * 1000).toISOString().substr(11, 8)
    }

    const getFract = (second) => {
        const frac = second % 1
        return frac.toFixed(3).split('.')[1]
    }
    if (!options || !options.groupWords) {
        app.iterateRegions((region) => {
            let speaker = self.formatSpeaker(region.data.speaker);
            region.data.words.forEach((word) => {
                let segment = `${segment_id}\n`
                segment += `${toHHMMSS(word.start)},${getFract(word.start)} --> ${toHHMMSS(word.end)},${getFract(word.end)}\n`
                segment += `(${speaker}_${region_id.toString().padStart(5, '0')}_audio)\n`
                segment +=`${word.text.length ? word.text : EMPTY_TEXT}\n`
                segment +=`\n`
                output.push(segment)
                segment_id++;
            });
            region_id++
        }, fileIndex, true);
    } else {
        app.iterateRegions((region) => {
            let segment = `${segment_id}\n`
            segment += `${toHHMMSS(region.start)},${getFract(region.start)} --> ${toHHMMSS(region.end)},${getFract(region.end)}\n`
            const wordText = region.data.words.map((w) => w.text)
            const fullText = wordText.join(' ')
            segment += `${fullText.length ? fullText : EMPTY_TEXT}\n`
            segment +=`\n`
            output.push(segment)
            segment_id++
        }, fileIndex, true);
    }

    return output.join('')
}