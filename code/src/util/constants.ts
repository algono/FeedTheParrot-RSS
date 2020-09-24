// Slot names
export const feedSlotName = 'feed';

// Other constants
//export const MAX_CHARACTERS = 8000; // Max characters allowed in an Alexa response. If surpassed, it will fail.
export const LONG_PAUSE = '<break strength="strong"/>';
export const EXTRA_LONG_PAUSE = '<break strength="x-strong"/>';
export const PAUSE_BETWEEN_ITEMS = `${EXTRA_LONG_PAUSE}<audio src="soundbank://soundlibrary/computers/beeps_tones/beeps_tones_08"/>${EXTRA_LONG_PAUSE}`;

export const PAUSE_BETWEEN_FIELDS = '<break strength="strong"/>';
export const PAUSE_BETWEEN_FIELDS_CARD = '.\n\n';