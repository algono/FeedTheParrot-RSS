import { ui } from 'ask-sdk-model';
import fc from 'fast-check';
import { getSpeakOutput } from '../../src/util/helpers';

test('getSpeakOutput works with ssml', () => {
    fc.assert(
        fc.property(
            fc.string().map((str) => `<ssml>${str}</ssml>`),
            (ssmlOutput) => {
                const ssmlOutputSpeech: ui.SsmlOutputSpeech = {
                    type: 'SSML',
                    ssml: ssmlOutput,
                };

                const speakOutput = getSpeakOutput(ssmlOutputSpeech);

                expect(speakOutput).toEqual(ssmlOutput);
            }
        )
    );
});

test('getSpeakOutput works with plain text', () => {
    fc.assert(
        fc.property(fc.string(), (textOutput) => {
            const plainTextOutputSpeech: ui.PlainTextOutputSpeech = {
                type: 'PlainText',
                text: textOutput,
            };

            const speakOutput = getSpeakOutput(plainTextOutputSpeech);

            expect(speakOutput).toEqual(textOutput);
        })
    );
});
