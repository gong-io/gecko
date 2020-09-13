import { EXTRA_DISCREPANCY_TIME } from '../constants'

class DiscrepancyService {
    updateSelectedDiscrepancy (context, wavesurferContext) {
        if (!context.discrepancies) return;
        let time = wavesurferContext.wavesurfer.getCurrentTime();

        let oldSelectedDiscrepancy = document.getElementsByClassName('selected-discrepancy')[0];
        if (oldSelectedDiscrepancy) {
            oldSelectedDiscrepancy.classList.remove('selected-discrepancy');
        }

        let i = 0;
        for (; i < context.filteredDiscrepancies.length; i++) {
            if (context.filteredDiscrepancies[i].start - EXTRA_DISCREPANCY_TIME > time) {
                break;
            }
        }

        i--;

        if (i >= 0 && context.filteredDiscrepancies[i].end + EXTRA_DISCREPANCY_TIME > time) {
            let newSelectedDiscrepancy = document.getElementById('discrepancy_' + (i).toString());
            if (newSelectedDiscrepancy) {
                newSelectedDiscrepancy.classList.add('selected-discrepancy');
                // newSelectedDiscrepancy.scrollIntoView();
            }
        }
    }

    playDiscrepancy(wavesurferContext, discrepancy) {
        wavesurferContext.wavesurfer.play(discrepancy.start - EXTRA_DISCREPANCY_TIME,
            discrepancy.end + EXTRA_DISCREPANCY_TIME);
    }

    jumpNextDiscrepancy(context, wavesurferContext) {
        if (!context.discrepancies) return;

        let time = wavesurferContext.wavesurfer.getCurrentTime();

        let i = 0;
        for (; i < context.filteredDiscrepancies.length; i++) {
            if (context.filteredDiscrepancies[i].start > time + EXTRA_DISCREPANCY_TIME) {
                break;
            }
        }

        if (context.filteredDiscrepancies[i]) {
            this.playDiscrepancy(wavesurferContext, context.filteredDiscrepancies[i]);
        }
    }

    jumpPreviousDiscrepancy (context, wavesurferContext) {
        if (!context.discrepancies) return;

        let time = wavesurferContext.wavesurfer.getCurrentTime();

        let i = context.filteredDiscrepancies.length - 1;
        for (; i >=0; i--) {
            if (context.filteredDiscrepancies[i].end < time + EXTRA_DISCREPANCY_TIME) {
                break;
            }
        }

        if (context.filteredDiscrepancies[i - 1]) {
            context.discrepancyService.playDiscrepancy(wavesurferContext, context.filteredDiscrepancies[i - 1]);
        }
    }

    toCSV (context) {
        const { discrepancies, filesData } = context
        const header = [ filesData[0].filename, filesData[1].filename, 'Choice', 'Start', 'End' ]
        const escape = (t) => `"${t}"`
        const rows = discrepancies.map(d => {
            const oldText = d.oldText ? d.oldText : ''
            const newText = d.newText ? d.newText : ''
            const choice = d.choice ? (d.choice == 'old' ? '1' : '2') : ''
            const timeStart = parseFloat(d.start).toFixed(3)
            const timeEnd = parseFloat(d.end).toFixed(3)
            return [ oldText, newText, choice, timeStart, timeEnd].map(escape)
        })

        return [header.map(escape), ...rows].map(r => r.join(',')).join('\n')
    }
}

export default DiscrepancyService