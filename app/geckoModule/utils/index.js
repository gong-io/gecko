import geckoEditor from './geckoEditor'
import ZoomTooltip from './zoomTooltip'
import { parseAndLoadAudio } from './fileUtils'
import DomUtils from './domUtils'
import './soundtouch'

import * as constants from '../constants'

export const jsonStringify = (json) => {
    return JSON.stringify(json, (key, value) => {
        // limit precision of floats
        if (typeof value === 'number') {
            return parseFloat(value.toFixed(2));
        }
        return value;
    })
}

export const str_pad_left = (string, pad, length) => {
    return (new Array(length + 1).join(pad) + string).slice(-length);
}

export const secondsToMinutes = (time) => {
    var nstring = (time.toFixed(3) + ""),
        nindex = nstring.indexOf("."),
        floatPart = (nindex > -1 ? nstring.substring(nindex + 1) : "000")
    return str_pad_left(Math.floor(time / 60), '0', 2) + ':' + str_pad_left(Math.floor(time % 60), '0', 2) + "." + floatPart
}

export const sortDict = (dict, sortBy, sortFunction) => {
    var sorted = {};

    if (sortBy !== undefined) {
        sortFunction = (a, b) => {
            return (dict[a][sortBy] < dict[b][sortBy]) ? -1 : ((dict[a][sortBy] > dict[b][sortBy]) ? 1 : 0)
        };
    }

    // sort by keys if sortFunction is undefined
    Object.keys(dict).sort(sortFunction).forEach((key) => {
        sorted[key] = dict[key];
    });

    return sorted;
}

// for debugging
export const _printRegionsInfo = (parent, fileIndex) => {
    let i = 0;
    var formatted = {};
    parent.iterateRegions((region) => {
        var r = parent.copyRegion(region);
        r.i = i;
        r.fileIndex = r.data.fileIndex;
        r.speaker = r.data.speaker.join(constants.SPEAKERS_SEPARATOR);
        r.initFinished = r.data.initFinished;
        r.isDummy = r.data.isDummy;
        delete r.data;
        delete r.drag;
        delete r.minLength;
        var id = r.id;
        delete r.id;
        formatted[id] = r;
        i++;
    }, fileIndex, true);

    console.table(formatted);
}

export const _printHistoryInfo = (parent, onlyAvailableHistory) => {
    Object.keys(parent.regionsHistory).forEach((key) => {
        var history = parent.regionsHistory[key];
        var formatted = [];

        if (onlyAvailableHistory && history.length < 2) {
            return;
        }

        for (let i = 0; i < history.length; i++) {
            var region = history[i];
            if (region) {
                var r = parent.copyRegion(region);
                r.fileIndex = r.data.fileIndex;
                r.speaker = r.data.speaker.join(constants.SPEAKERS_SEPARATOR);
                r.initFinished = r.data.initFinished;
                delete r.data;
                delete r.drag;
                delete r.minLength;

                formatted.push(r);
            } else {
                formatted.push(region);
            }
        }

        console.log(key);
        console.table(formatted);
    });
}

export const pad = (n) => n < 10 ? '0' + n : n

export const formatTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`

export const getCurrentTimeStamp = () => formatTime(new Date())

export const formatDate = (date) => {
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const strTime = pad(hours) + ':' + pad(minutes)
    return date.getMonth()+1 + "/" + date.getDate() + "/" + date.getFullYear() + "  " + strTime;
}
export const copyRegion = (region) => {
    //TODO: change the copy of data to deep copy by "JSON.parse(JSON.stringify(object))"
    // and then handle "words" correctly
    const ret = {
        id: region.id,
        // data: {
        //     initFinished: region.data.initFinished,
        //     words: JSON.parse(JSON.stringify(region.data.words)),
        //     fileIndex: region.data.fileIndex,
        //     speaker: region.data.speaker.slice() // copy by value
        // },
        data: JSON.parse(JSON.stringify(region.data)),
        start: region.start,
        end: region.end,
        drag: region.drag,
        minLength: constants.MINIMUM_LENGTH
    }

    return ret
}

export const splitPunctuation = (text) => {
    let punct = ''

    while (constants.PUNCTUATIONS.indexOf(text[text.length - 1]) !== -1) {
        punct = text[text.length - 1] + punct
        text = text.substring(0, text.length - 1)
    }

    if (punct === '...') {
        punct = '…'
    }

    return [text, punct]
}

export const sortLegend = (legend) => {
    return legend.sort((a, b) => {
        if (a.isDefault && !b.isDefault) {
            return 1
        } else if (!a.isDefault && b.isDefault) {
            return -1
        } else {
            return 0
        }
    })
}

export const splitLegendSpeakers = (legend) => {
    const firstDefaultIndex = legend.findIndex(s => s.isDefault)
    const regularSpeakers = legend.slice(0, firstDefaultIndex)
    const defaultSpeakers = legend.slice(firstDefaultIndex, legend.length)
    return {
        regularSpeakers,
        defaultSpeakers   
    }
}

export const prepareLegend = (fileDataLegend) => {
    const legend = sortLegend(fileDataLegend)
    let { regularSpeakers, defaultSpeakers } = splitLegendSpeakers(legend)
    regularSpeakers = regularSpeakers.sort((a, b) => {
        if (a.value.toLowerCase() > b.value.toLowerCase()) {
            return 1
        } else if (a.value.toLowerCase() < b.value.toLowerCase()) {
            return -1
        } else {
            return 0
        }
    }).map((rs, index) => {
        return {
            ...rs,
            shortcut: index + 1,
            color: rs.color ? rs.color : constants.SPEAKER_COLORS[index % constants.SPEAKER_COLORS.length]
        }
    })
    return [ ...regularSpeakers, ...defaultSpeakers ]
}

export { geckoEditor, parseAndLoadAudio, ZoomTooltip, DomUtils }
