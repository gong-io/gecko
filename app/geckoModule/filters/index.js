
export const mulSearch = () => {
    return (items, searchText) => {
        if (!searchText) return items;

        let onlyUnmarked = false;

        if (searchText[0] === '!') {
            onlyUnmarked = true;
            searchText = searchText.substring(1);
        }

        let searchWords = searchText.toLowerCase().split(',');

        return items.filter(x => {
            if (onlyUnmarked && x.choice) {
                return false;
            }
            return searchWords.some(searchWord => {
                    return (x.newText && x.newText.toLowerCase().includes(searchWord))
                        || (x.oldText && x.oldText.toLowerCase().includes(searchWord));
                }
            );
        });
    }
}

export const speakersFilter = () => {
    return (items) => {
        if (items && items.length) {
            return items.join(', ')
        } else if (items && !items.length) {
            return 'No speaker'
        } else {
            return ''
        }
    }
}

export const speakersFilterColor = () => {
    return (items, legend) => {
        if (items && items.length) {
            const spans = items.map(s => {
                const legendItem = legend.find(l => l.value === s)
                return `<span style="color: ${legendItem.color};">${s}</span>`
            })
            return spans.join(', ')
        } else if (items && !items.length) {
            return 'No speaker'
        } else {
            return ''
        }
    }
}

export const toTrusted = ($sce) =>{
    return (text) => {
        return $sce.trustAsHtml(text)
    };
}

export const toMMSS = () =>{
    return (seconds) => {
        return new Date(seconds * 1000).toISOString().substr(14, 5)
    }
}