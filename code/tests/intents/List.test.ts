import { capture, when } from 'ts-mockito';
import { ListIntentHandler } from '../../src/intents/List';
import { mockHandlerInput } from '../helpers/mocks/HandlerInputMocks';
import { testInAllLocales, testIntentCanHandle } from '../helpers/helperTests';
import fc from 'fast-check';
import { escapeRegex } from '../helpers/escapeRegex';
import { UserData } from '../../src/database/UserData';

jest.mock('ask-sdk-core');

describe('List intent', () => {
  testIntentCanHandle({ handler: ListIntentHandler, intentName: 'ListIntent' });

  testInAllLocales(
    'speaks and shows card with custom message when feeds list is empty'
  )(async (locale) => {
    const mocks = await mockHandlerInput({
      locale,
    });

    const userData: UserData = { feeds: null, feedNames: [] };
    when(mocks.mockedAttributesManager.getPersistentAttributes()).thenResolve(
      userData
    );

    await ListIntentHandler.handle(mocks.instanceHandlerInput);

    const [responseSpeakOutput] = capture(
      mocks.mockedResponseBuilder.speak
    ).last();
    const [, responseCardContent] = capture(
      mocks.mockedResponseBuilder.withSimpleCard
    ).last();

    const feedListEmptyMessage = mocks.t('FEED_LIST_EMPTY_MSG');

    expect(responseSpeakOutput.startsWith(feedListEmptyMessage)).toBe(true);
    expect(responseCardContent.startsWith(feedListEmptyMessage)).toBe(true);
  });

  testInAllLocales('shows all feeds')(async (locale) => {
    const mocks = await mockHandlerInput({
      locale,
    });

    const userData: UserData = { feeds: null, feedNames: null };
    when(mocks.mockedAttributesManager.getPersistentAttributes()).thenResolve(
      userData
    );

    await fc.assert(
      fc.asyncProperty(
        // Allow only non-empty arrays (we have another test for empty ones)
        fc.array(fc.string(), { minLength: 1 }),

        async (feedNames) => {
          userData.feedNames = feedNames;

          await ListIntentHandler.handle(mocks.instanceHandlerInput);

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
});
