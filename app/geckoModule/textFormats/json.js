import * as constants from '../constants'
import { jsonStringify, splitPunctuation } from '../utils'

export const parse = (data, $parent) => {
    if (typeof data === 'string') {
        data = JSON.parse(data)
    }

    var monologues = data['monologues'];
    for (var i = 0, l = monologues.length; i < l; i++) {
        var monologue = monologues[i];


        if (!monologue.speaker) {
            // monologue.speaker = {id: constants.UNKNOWN_SPEAKER};
            monologue.speaker = "";
        }

        if (monologue.start === undefined) monologue.start = monologue.terms[0].start;
        if (monologue.end === undefined) monologue.end = monologue.terms.slice(-1)[0].end;


        // if (!monologue.text && monologue.terms) {
        //     monologue.text = "";
        //     for (var t = 0; t < monologue.terms.length; t++) {
        //         var term = monologue.terms[t];
        //         if (term.text) {
        //             if (term.type === "WORD") {
        //                 monologue.text += " ";
        //             }
        //
        //             monologue.text += term.text;
        //         }
        //     }
        // }


        if (monologue.terms) {
            monologue.words = monologue.terms;
            delete monologue.terms;
        } else {
            monologue.words = [];
        }


        // attach punctuation to the previous word
        for (let j = 0; j < monologue.words.length;) {
            let current = monologue.words[j];

            if (current.type === constants.PUNCTUATION_TYPE || current.text == '¿' || current.text == '¡') {
//                if (current.text.length > 1){
                for(let k=0; k < current.text.length; k++){
                    if ((current.text[k] == '¿' || current.text[k] == '¡') && j + 1 < monologue.words.length){
                        monologue.words[j + 1].text = current.text[k] + monologue.words[j + 1].text;
//                            monologue.words.splice(j, 1);
                    }
                    else if (j > 0){
                        monologue.words[j - 1].text += current.text[k];
                    }
                }
                monologue.words.splice(j, 1);
//                }

//                if ((current.text == '¿' || current.text == '¡') && j + 1 < monologue.words.length){
//                    monologue.words[j + 1].text = current.text + monologue.words[j + 1].text;
//                    monologue.words.splice(j, 1);
//                }
//                else if (j > 0){
//                    monologue.words[j - 1].text += current.text;
//                    monologue.words.splice(j, 1);
//                }
            } else {
                let textAndPunct = splitPunctuation(current.text);
                if (textAndPunct[2] != "" && textAndPunct[2][textAndPunct[2].length - 1] == '¿' || textAndPunct[2][textAndPunct[2].length - 1] == '¡'){
                    monologue.words[j + 1].text = current.text[current.text.length - 1] + monologue.words[j + 1].text;
                    current.text = current.text.substring(0, current.text.length - 1);
                }
                else
                    j++;
            }
        }
    }

    const words = monologues.reduce((accumulator, currentValue) => {
        if (currentValue.words) {
            return [...accumulator, ...currentValue.words]
        }
    }, [])
    
    $parent.comparsionData.push(words);

//    if (data['colors']) {
//        return [ monologues, data['colors'] ]
//    }

    return [ monologues, null ];
}

export const convert = (app, fileIndex) => {
    var self = app;
    var data = {schemaVersion: "2.0", monologues: []};
    app.iterateRegions((region) => {
        let words = region.data.words;
        let terms = []
        if (words) {
            words.forEach(w => {
                // copy word to cancel references
                let t = JSON.parse(JSON.stringify(w))
                delete t.uuid
                delete t.wasEdited

                let textAndPunct = splitPunctuation(t.text);
                //trim the punctuation from the original
                if (textAndPunct[0] !== ""){
                    terms.push({
                        start: t.start,
                        end: t.start,
                        text: textAndPunct[0],
                        confidence: t.confidence,
                        type: constants.PUNCTUATION_TYPE
                    })
                }

                t.text = textAndPunct[1]
                t.type = constants.WORD_TYPE;
                terms.push(t);

                if (textAndPunct[2] !== ""){
                    terms.push({
                        start: t.end,
                        end: t.end,
                        text: textAndPunct[2],
                        confidence: t.confidence,
                        type: constants.PUNCTUATION_TYPE
                    })
                }
            })
        }
        data.monologues.push({
            speaker: {id: self.formatSpeaker(region.data.speaker), name: region.data.speakerName},
            start: region.start,
            end: region.end,
            terms: terms
        });

    }, fileIndex, true);

//    data.colors = {}
//    app.filesData[fileIndex].legend.forEach(l => {
//        data.colors[l.value] = l.color
//    })

    return jsonStringify(data);
}