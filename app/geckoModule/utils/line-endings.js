export const detectLineEndings = (source) => {
    const cr   = source.split('\r').length
    const lf   = source.split('\n').length
    const crlf = source.split('\r\n').length

    if (cr + lf === 0) {
        return 'NONE'
    }

    if (crlf === cr && crlf === lf) {
        return 'CRLF'
    }

    if (cr > lf) {
        return 'CR'
    } else {
        return 'LF'
    }
}

const getLineEnding = (type) => {
  if ( ['CR', 'LF', 'CRLF'].indexOf(type) === -1) {
    throw new Error('Unsupported line ending');
  }

  if (type === 'LF') {
    return '\n'
  }

  if (type === 'CR') {
    return '\r'
  }

  if (type === 'CRLF') {
    return '\r\n'
  }
}

export const setLineEndings = (source, lineEnding) => {
  var current = detectLineEndings(source)

  if (current === lineEnding ) {
    return source
  }

  return source.replace(new RegExp(getLineEnding(current), 'g'), getLineEnding(lineEnding));
}