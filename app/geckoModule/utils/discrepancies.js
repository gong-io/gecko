import { diffArrays } from 'diff'

const handleDiscrepancy = (discrepancy, diffItem) => {
    if (diffItem.removed) {
        if (discrepancy.old) {
            throw 'Does not suppose to happen'
        }
        discrepancy.old = diffItem.value
    } else {
        if (discrepancy.new) {
            throw 'Does not suppose to happen'
        }
        discrepancy.new = diffItem.value
    }
}

export default (first, second) => {
    const ret = []

    let diff = diffArrays(first, second, {
        comparator: (x, y) => {
            return x.text === y.text
        }
    })

    for (let i = 0, length = diff.length - 1; i < length; i += 2) {
        const current = diff[i]
        const next = diff[i+1]
        if (current.removed || current.added) {
            const discrepancy = {}
            handleDiscrepancy(discrepancy, current)

            if (next.removed || next.added) {
                handleDiscrepancy(discrepancy, next)
            }

            let oldStart = Infinity
            let oldEnd = 0

            if (discrepancy.old) {
                discrepancy.oldText = discrepancy.old.map(x => x.text).join(' ')
                oldStart = discrepancy.old[0].start
                oldEnd = discrepancy.old[discrepancy.old.length - 1].end
            }

            let newStart = Infinity
            let newEnd = 0

            if (discrepancy.new) {
                discrepancy.newText = discrepancy.new.map(x => x.text).join(' ')
                newStart = discrepancy.new[0].start
                newEnd = discrepancy.new[discrepancy.new.length - 1].end
            }

            discrepancy.start = Math.min(oldStart, newStart)
            discrepancy.end = Math.max(oldEnd, newEnd)

            ret.push(discrepancy)
        }
    }

    return ret
}