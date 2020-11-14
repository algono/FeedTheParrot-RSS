import { ui } from 'ask-sdk-model';
import fc from 'fast-check';
import { capture } from 'ts-mockito';
import {
  RepeatIntentHandler,
  SaveResponseForRepeatingInterceptor,
} from '../../src/intents/Repeat';
import { mockHandlerInput } from '../helpers/mocks/HandlerInputMocks';
import { testIntentCanHandle } from '../helpers/helperTests';

describe('SaveResponseForRepeatingInterceptor', () => {
  async function testSaveResponseForRepeatingInterceptor(
    outputSpeech: ui.OutputSpeech
  ) {
    const sessionAttributes: { lastResponse?: string } = {};
    const mocks = await mockHandlerInput({
      sessionAttributes,
      outputSpeech,
    });

    SaveResponseForRepeatingInterceptor.process(
      mocks.instanceHandlerInput,
      mocks.instanceResponse
    );

    return sessionAttributes.lastResponse;
  }

  test('works with ssml', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string().map((str) => `<ssml>${str}</ssml>`),
        async (ssmlOutput) => {
          const ssmlOutputSpeech: ui.SsmlOutputSpeech = {
            type: 'SSML',
            ssml: ssmlOutput,
          };

          const lastResponse = await testSaveResponseForRepeatingInterceptor(
            ssmlOutputSpeech
          );

          expect(lastResponse).toEqual(ssmlOutput);
        }
      )
    );
  });

  test('works with plain text', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (textOutput) => {
        const plainTextOutputSpeech: ui.PlainTextOutputSpeech = {
          type: 'PlainText',
          text: textOutput,
        };

        const lastResponse = await testSaveResponseForRepeatingInterceptor(
          plainTextOutputSpeech
        );

        expect(lastResponse).toEqual(textOutput);
      })
    );
  });

  test('does not break with undefined response', async () => {
    const lastResponse = await testSaveResponseForRepeatingInterceptor(
      undefined
    );

    expect(lastResponse).toBeUndefined();
  });
});

jest.mock('ask-sdk-core');

describe('Repeat intent handler', () => {
  testIntentCanHandle({
    handler: RepeatIntentHandler,
    intentName: 'AMAZON.RepeatIntent',
  });

  test('outputs and reprompts last response given', async () => {
    const sessionAttributes: { lastResponse?: string } = {};
    const mocks = await mockHandlerInput({ sessionAttributes });

    fc.assert(
      fc.property(fc.string(), (lastResponse) => {
        sessionAttributes.lastResponse = lastResponse;
        RepeatIntentHandler.handle(mocks.instanceHandlerInput);

        const [responseSpeakOutput] = capture(
          mocks.mockedResponseBuilder.speak
        ).last();

        expect(responseSpeakOutput).toEqual(lastResponse);

        const [responseReprompt] = capture(
          mocks.mockedResponseBuilder.reprompt
        ).last();

        expect(responseReprompt).toEqual(lastResponse);
      })
    );
  });
});
