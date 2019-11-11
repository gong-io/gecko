import { parse as parseCTM, convert as convertCTM } from './ctm'
import { parse as parseRTTM, convert as convertRTTM } from './rttm'
import { parse as parseTSV, convert as convertTSV } from './tsv'
import { parse as parseJSON, convert as convertJSON } from './json'
import { parse as parseSRT, convert as convertSRT } from './srt'

const parse = (filename, data, app, parserOptions, ...args) => {
    const ext = filename.substr(filename.lastIndexOf('.') + 1);

    switch (ext) {
        case 'rttm':
            return parseRTTM(data, app, parserOptions, ...args)
        case 'tsv':
            return parseTSV(data, app, parserOptions, ...args)
        case 'json':
            return parseJSON(data, app, parserOptions, ...args)
        case 'ctm':
            return parseCTM(data, app, parserOptions, ...args)
        case 'srt':
            return parseSRT(data, app, parserOptions, ...args)
        default:
            alert('format ' + ext + ' is not supported')
            return undefined
    }
}

const convert = (format, parent, parserOptions, ...args) => {
    switch (format) {
        case 'rttm':
            return (fileIndex) => convertRTTM(parent, fileIndex, parserOptions)
        case 'tsv':
            return (fileIndex) => convertTSV(parent, fileIndex, parserOptions)
        case 'json':
            return (fileIndex) => convertJSON(parent, fileIndex, parserOptions)
        case 'ctm':
            return (fileIndex) => convertCTM(parent, fileIndex, parserOptions)
        case 'srt':
            return (fileIndex) => convertSRT(parent, fileIndex, parserOptions)
        default:
            alert('format ' + ext + ' is not supported')
            return () => ''
    }
}

export { parse, convert }