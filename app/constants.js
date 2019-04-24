export const DEFAULT_TEXT = "";

export const SEGMENT_DUMMY = {
    start: null,
    end: null,
    speaker: null,
    text: DEFAULT_TEXT,
    annotations: []
}

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

export const MINIMUM_LENGTH = 0.1;

export const NO_SPEAKER_COLOR = 'hsla(0, 0%, 30%, 0.1)';

export const ANNOTATIONS = [
    {name: "Music", id: "music"},
    {name: "Background noise", id: "background_noise"},
    {name: "Simultaneous speech", id: "simultaneous_speech"},
    {name: "Laughter", id: "laughter"},
    {name: "Hesitation", id: "hesitation"}
]

export const THRESHOLD_MS = 200;

export const ZOOM = 20;

export const PANEL_HEIGHT = 300; //px

export const EXTRA_DISCREPANCY_TIME = 1;