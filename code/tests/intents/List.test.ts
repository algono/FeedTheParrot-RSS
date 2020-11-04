import { capture } from 'ts-mockito';
import { ListIntentHandler } from '../../src/intents/List';
import { mockHandlerInput } from '../helpers/mocks/HandlerInputMocks';
import { testInAllLocales, testIntentCanHandle } from '../helpers/helperTests';
import * as fc from 'fast-check';
import { escapeRegex } from '../helpers/escapeRegex';

jest.mock('ask-sdk-core');
testIntentCanHandle({ handler: ListIntentHandler, intentName: 'ListIntent' });

testInAllLocales(
  'List intent speaks and shows card with custom message when feeds list is empty',
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

    const feedListEmptyMessage = mocks.t('FEED_LIST_EMPTY_MSG');

    expect(responseSpeakOutput.startsWith(feedListEmptyMessage)).toBe(true);
    expect(responseCardContent.startsWith(feedListEmptyMessage)).toBe(true);
  }
);

testInAllLocales('List intent shows all feeds', async (locale) => {
  const sessionAttributes: { feedNames?: string[] } = {};

  const mocks = await mockHandlerInput({
    locale,
    sessionAttributes: sessionAttributes,
  });

  fc.assert(
    fc.property(
      // Allow only non-empty arrays (we have another test for empty ones)
      fc.array(fc.string(), { minLength: 1 }),

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
