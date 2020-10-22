import { ui } from 'ask-sdk-model';
import fc from 'fast-check';
import { capture } from 'ts-mockito';
import {
  RepeatIntentHandler,
  SaveResponseForRepeatingInterceptor,
} from '../../src/intents/Repeat';
import { mockHandlerInput } from '../helpers/HandlerInputMocks';
import { testIntentCanHandle } from '../helpers/helperTests';

async function testSaveResponseForRepeatingInterceptor(
  outputSpeech: ui.OutputSpeech
) {
  const sessionAttributes: { lastResponse?: string } = {};
  const mocks = await mockHandlerInput({
    sessionAttributes,
    outputSpeech,
    mockResponse: true,
  });

  SaveResponseForRepeatingInterceptor.process(mocks.instanceHandlerInput);

  return sessionAttributes.lastResponse;
}

test('SaveResponseForRepeatingInterceptor works with ssml', async () => {
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

test('SaveResponseForRepeatingInterceptor works with plain text', async () => {
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

test('SaveResponseForRepeatingInterceptor does not break with undefined response', async () => {
  const lastResponse = await testSaveResponseForRepeatingInterceptor(undefined);

  expect(lastResponse).toBeUndefined();
});

jest.mock('ask-sdk-core');
testIntentCanHandle({
  handler: RepeatIntentHandler,
  intentName: 'AMAZON.RepeatIntent',
});

test('Repeat intent handler outputs and reprompts last response given', async () => {
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
