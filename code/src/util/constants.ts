// Slot names
export const feedSlotName = 'feed';

// Character limits

/*
// In the feed I have been testing, these are my current results:
// Max characters still works at: 65336
// It breaks at: 99326
//
// For now, I will use an arbitrary number above it that works with my test feed.
//
// (Note: According to Alexa docs, the maximum is 24 kilobytes - 24000 characters, but that doesn't seem to be the case)
*/
export const MAX_RESPONSE_LENGTH = 71907;

export const MAX_CHARACTERS_SPEECH = 8000; // Max characters allowed in an Alexa response's outputSpeech. If surpassed, it will fail.

// Pauses
export const LONG_PAUSE = '<break strength="strong"/>';
export const EXTRA_LONG_PAUSE = '<break strength="x-strong"/>';
export const PAUSE_BETWEEN_ITEMS = `${EXTRA_LONG_PAUSE}<audio src="soundbank://soundlibrary/computers/beeps_tones/beeps_tones_08"/>${EXTRA_LONG_PAUSE}`;
