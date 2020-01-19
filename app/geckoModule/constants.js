// export const DEFAULT_TEXT = "";

// export const SEGMENT_DUMMY = {
//     start: null,
//     end: null,
//     speaker: null,
//     text: DEFAULT_TEXT,
//     annotations: []
// }

export const PLAYBACK_SPEED = [
    0.5, 0.75, 1, 1.25, 1.5, 1.75, 2
];

export const SPEAKER_COLORS = [
    "#a94dec",
    "#54F2D9",
    "#fbeb9b",
    "#f58230",
    "#3cb44b",
    "#800000",
    "#ffe119",
    "#911eb4",
    "#46f0f0",
    "#008080",
    "#aa6e28",
    "#808000",
    "#000080"
];

export const UNKNOWN_SPEAKER = "<NA>";

export const EMPTY_TEXT = "<NA>";

export const SPEAKERS_SEPARATOR = "+";

export const NO_CONFIDENCE = -1;

/* var speakers = {
    '[crosstalk]': "#e1c7ff",
    '[dialtone]': "#e1c7ff",
    '[music]': "#e1c7ff",
    '[foreign]': "#e1c7ff",
    '[noise]': "#e1c7ff",
    '[beep]': "#e1c7ff",
    '[laughter]': "#e1c7ff",
    '[bubble]': "#e1c7ff",
    '[recording]': "#e1c7ff"
}; */

export const UNKNOWN_SPEAKER_COLOR = '#808080';

const speakers = [
    { display: '[noise]', value: '[noise]', shortcut: 1, color: '#e1c7ff'},
    { display: '[crosstalk]', value: '[crosstalk]', shortcut: 2, color: '#e1c7ff'},
    { display: '[bubble]', value: '[bubble]', shortcut: 3, color: '#e1c7ff'},
    { display: '[laughter]', value: '[laughter]', shortcut: 4, color: '#e1c7ff'},
    { display: '[music]', value: '[music]', shortcut: 5, color: '#e1c7ff'},
    { display: '[recording]', value: '[recording]', shortcut: 6, color: '#e1c7ff'},
    { display: '[dialtone]', value: '[dialtone]', shortcut: 7, color: '#e1c7ff'},
    { display: '[foreign]', value: '[foreign]', shortcut: 8, color: '#e1c7ff'},
    { display: '[beep]', value: '[beep]', shortcut: 9, color: '#e1c7ff'}
]

export const defaultSpeakers = speakers;


export const MINIMUM_LENGTH = 0.1;

export const SPEAKER_NAME_CHANGED_OPERATION_ID = '1';
export const REGION_TEXT_CHANGED_OPERATION_ID = '2';

export const NO_SPEAKER_COLOR = 'hsla(0, 0%, 30%, 0.1)';

export const ANNOTATIONS = [
    {name: "Music", id: "music"},
    {name: "Background noise", id: "background_noise"},
    {name: "Simultaneous speech", id: "simultaneous_speech"},
    {name: "Laughter", id: "laughter"},
    {name: "Hesitation", id: "hesitation"}
]

export const THRESHOLD_MS = 200;

export const SAVE_THRESHOLD = 60 * 1000

export const ZOOM = 20;
export const MAX_ZOOM = 500;

export const PANEL_HEIGHT = 300; //px

export const EXTRA_DISCREPANCY_TIME = 1;

export const PUNCTUATIONS = ". ! , … ?".split(' ');
export const PUNCTUATION_TYPE = "PUNCTUATION"
export const WORD_TYPE = "WORD"

export const TOLERANCE = 0.00001;

export const DEFAULT_GAIN = 1
export const MIN_GAIN = 0
export const MAX_GAIN = 2