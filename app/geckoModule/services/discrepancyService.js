import { EXTRA_DISCREPANCY_TIME } from '../constants'

class DiscrepancyService {
    updateSelectedDiscrepancy (context) {
        if (!context.discrepancies) return;
        let time = context.wavesurfer.getCurrentTime();

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

    playDiscrepancy(context, discrepancy) {
        context.wavesurfer.play(discrepancy.start - EXTRA_DISCREPANCY_TIME,
            discrepancy.end + EXTRA_DISCREPANCY_TIME);
    }

    jumpNextDiscrepancy(context) {
        if (!context.discrepancies) return;

        let time = context.wavesurfer.getCurrentTime();

        let i = 0;
        for (; i < context.filteredDiscrepancies.length; i++) {
            if (context.filteredDiscrepancies[i].start > time + EXTRA_DISCREPANCY_TIME) {
                break;
            }
        }

        if (context.filteredDiscrepancies[i]) {
            this.playDiscrepancy(context, context.filteredDiscrepancies[i]);
        }
    }
}

export default DiscrepancyService