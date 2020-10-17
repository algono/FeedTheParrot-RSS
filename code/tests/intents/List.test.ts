import { capture } from 'ts-mockito';
import { ListIntentHandler } from '../../src/intents/List';
import { mockHandlerInput } from '../helpers/HandlerInputMocks';
import { testInAllLocales, testIntentCanHandle } from '../helpers/helperTests';
import * as fc from 'fast-check';

jest.mock('ask-sdk-core');
testIntentCanHandle({ handler: ListIntentHandler, intentName: 'ListIntent' });

let logSpy: jest.SpyInstance;

// Silence console.log for all tests in this suite
beforeAll(() => (logSpy = jest.spyOn(console, 'log').mockImplementation()));

testInAllLocales(
  'List intent shows custom message when feeds list is empty',
  async (locale) => {
    const mocks = await mockHandlerInput({
      locale,
      sessionAttributes: { feedNames: [] },
    });

    ListIntentHandler.handle(mocks.instanceHandlerInput);

    const [responseSpeakOutput] = capture(
      mocks.mockedResponseBuilder.speak
    ).last();
    const [, responseCardContent] = capture(
      mocks.mockedResponseBuilder.withSimpleCard
    ).last();

    const feedListEmptyMessage: string = mocks.t('FEED_LIST_EMPTY_MSG');

    expect(responseSpeakOutput.startsWith(feedListEmptyMessage)).toBe(true);
    expect(responseCardContent.startsWith(feedListEmptyMessage)).toBe(true);
  }
);

function escapeRegex(currentValue: string) {
  return currentValue.replace(/[\W]/g, '\\$&');
}

testInAllLocales('List intent shows all feeds', async (locale) => {
  const sessionAttributes: { feedNames?: string[] } = {};

  const mocks = await mockHandlerInput({
    locale,
    sessionAttributes: sessionAttributes,
  });

  fc.assert(
    fc.property(
      // Allow only non-empty arrays (we have another test for empty ones)
      fc.array(fc.string()).filter((arr) => arr.length > 0),

      (feedNames) => {
        sessionAttributes.feedNames = feedNames;

        ListIntentHandler.handle(mocks.instanceHandlerInput);

        const [responseSpeakOutput] = capture(
          mocks.mockedResponseBuilder.speak
        ).last();
        const [, responseCardContent] = capture(
          mocks.mockedResponseBuilder.withSimpleCard
        ).last();

        // Result (example): '.*?first.*?second'
        const feedNamesRegex = feedNames.reduce(
          (previousValue, currentValue) =>
            previousValue + '.*?' + escapeRegex(currentValue),

          ''
        );
        // The output contains all feed names in order
        // (the 's' flag causes the dot to match all characters - including newlines)
        const containsInOrderRegex = new RegExp(`${feedNamesRegex}.*`, 's');

        expect(responseSpeakOutput).toMatch(containsInOrderRegex);
        expect(responseCardContent).toMatch(containsInOrderRegex);
      }
    )
  );
});

// Restore the original console.log
afterAll(() => logSpy.mockRestore());