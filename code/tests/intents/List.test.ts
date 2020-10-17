import { capture } from 'ts-mockito';
import { ListIntentHandler } from '../../src/intents/List';
import { mockHandlerInput } from '../helpers/HandlerInputMocks';
import { testInAllLocales, testIntentCanHandle } from '../helpers/helperTests';

jest.mock('ask-sdk-core');
testIntentCanHandle({ handler: ListIntentHandler, intentName: 'ListIntent' });

testInAllLocales('List intent shows all feeds', async (locale) => {
  const feedNames = ['lorem', 'ipsum'];

  const mocks = await mockHandlerInput({
    locale,
    sessionAttributes: { feedNames: feedNames },
  });

  ListIntentHandler.handle(mocks.instanceHandlerInput);

  const [responseSpeakOutput] = capture(
    mocks.mockedResponseBuilder.speak
  ).last();
  const [, responseCardContent] = capture(
    mocks.mockedResponseBuilder.withSimpleCard
  ).last();

  // The output contains all feed names in order
  // (the 's' flag causes the dot to match all characters - including newlines)
  const containsInOrderRegex = new RegExp(`.*?${feedNames.join('.*?')}.*`, 's');

  expect(responseSpeakOutput).toMatch(containsInOrderRegex);
  expect(responseCardContent).toMatch(containsInOrderRegex);
});

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
