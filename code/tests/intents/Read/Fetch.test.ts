import { getSlotValue, getLocale } from 'ask-sdk-core';
import { Slot, SlotConfirmationStatus } from 'ask-sdk-model';
import fc from 'fast-check';
import { mocked } from 'ts-jest/utils';
import {
  anyString,
  instance,
  when,
  spy,
  anything,
  verify,
  capture,
} from 'ts-mockito';
import { ReadIntentHandler } from '../../../src/intents/Read/Fetch';
import {
  ReadState,
  ReadItemIntentHandler,
} from '../../../src/intents/Read/Item';
import { Feed, FeedItems } from '../../../src/logic/Feed';
import { getItems } from '../../../src/util/feed/getItems';
import { feedSlotName } from '../../../src/util/constants';
import {
  feedRecord,
  feedItemsRecord,
} from '../../helpers/fast-check/arbitraries/feed';
import {
  testIntentCanHandle,
  testInAllLocales,
} from '../../helpers/helperTests';
import { mockHandlerInput } from '../../helpers/mocks/HandlerInputMocks';
import { mockIntent } from '../../helpers/mocks/mockIntent';
import { UserData } from '../../../src/database/UserData';

jest.mock('ask-sdk-core');
jest.mock('../../../src/util/feed/getItems');

describe('ReadIntent', () => {
  testIntentCanHandle({
    handler: ReadIntentHandler,
    intentName: 'ReadIntent',
  });

  testInAllLocales('If there are no feeds available, warn the user')(
    async (locale) => {
      const feedNamesValues: readonly string[][] = [undefined, null, []];

      for (const feedNames of feedNamesValues) {
        const mocks = await mockHandlerInput({ locale });

        const userData: UserData = { feeds: null, feedNames };
        when(
          mocks.mockedAttributesManager.getPersistentAttributes()
        ).thenResolve(userData);

        mocked(getSlotValue).mockReturnValue(undefined);

        await ReadIntentHandler.handle(mocks.instanceHandlerInput);

        const [speakOutput] = capture(mocks.mockedResponseBuilder.speak).last();

        expect(speakOutput).toContain(mocks.t('FEED_LIST_EMPTY_MSG'));
      }
    }
  );

  test('If the feed name has not been received yet, let Alexa continue the dialogue', () =>
    fc.assert(
      fc.asyncProperty(
        fc.array(fc.string(), { minLength: 1 }),
        async (feedNames) => {
          const mocks = await mockHandlerInput();

          const userData: UserData = { feeds: null, feedNames };
          when(
            mocks.mockedAttributesManager.getPersistentAttributes()
          ).thenResolve(userData);

          mocked(getSlotValue).mockReturnValue(undefined);

          const { intentMock } = mockIntent();

          await ReadIntentHandler.handle(mocks.instanceHandlerInput);

          verify(mocks.mockedResponseBuilder.speak(anyString())).never();

          verify(
            mocks.mockedResponseBuilder.addDelegateDirective(
              instance(intentMock)
            )
          ).once();
        }
      )
    ));

  testInAllLocales(
    'If the feed is not on our list, invalidate the feed name given, warn the user and try again'
  )((locale) =>
    fc.assert(
      fc.asyncProperty(
        fc.array(fc.string(), { minLength: 1 }),
        fc.string({ minLength: 1 }),
        async (feedNames, feedName) => {
          fc.pre(!feedNames.includes(feedName));

          const mocks = await mockHandlerInput({
            locale,
          });

          const userData: UserData = { feeds: null, feedNames };
          when(
            mocks.mockedAttributesManager.getPersistentAttributes()
          ).thenResolve(userData);

          mocked(getSlotValue).mockReturnValue(feedName);

          const { intentMock } = mockIntent();

          const feedSlot: Slot = {
            name: feedName,
            confirmationStatus: 'NONE',
          };

          when(intentMock.slots).thenReturn({
            [feedSlotName]: feedSlot,
          });

          mocked(getItems).mockImplementation(() => {
            throw new Error('Should not be trying to get any items');
          });

          await ReadIntentHandler.handle(mocks.instanceHandlerInput);

          expect(feedSlot.confirmationStatus).toEqual<SlotConfirmationStatus>(
            'DENIED'
          );

          verify(
            mocks.mockedResponseBuilder.speak(mocks.t('NO_FEED_MSG'))
          ).once();

          verify(
            mocks.mockedResponseBuilder.addDelegateDirective(
              instance(intentMock)
            )
          ).once();
        }
      )
    )
  );

  testInAllLocales(
    "Gets items from feed with Alexa's locale, stores a ReadState and starts reading items"
  )((locale) =>
    fc.assert(
      fc.asyncProperty(
        fc
          .tuple(
            fc.set(feedRecord(), {
              minLength: 1,
              compare: (a, b) => a.name === b.name,
            }),
            fc.nat()
          )
          .map(([feeds, index]) => {
            const feedNames = feeds.map((feed) => feed.name);
            return {
              feeds: feeds.reduce<{ [x: string]: Feed }>((feeds, feed) => {
                feeds[feed.name] = feed as Feed;
                return feeds;
              }, {}),
              feedNames,
              feed: feeds[index % feeds.length],
            };
          }),
        feedItemsRecord(),
        async (
          {
            feeds,
            feedNames,
            feed,
          }: {
            feeds: { [x: string]: Feed };
            feedNames: string[];
            feed: Feed;
          },
          feedItems: FeedItems
        ) => {
          const sessionAttributes: {
            readState?: ReadState;
          } = {};

          const mocks = await mockHandlerInput({
            locale,
            sessionAttributes,
          });

          const userData: UserData = { feeds, feedNames };
          when(
            mocks.mockedAttributesManager.getPersistentAttributes()
          ).thenResolve(userData);

          mocked(getLocale).mockReturnValue(locale);

          mocked(getSlotValue).mockReturnValue(feed.name);

          mocked(getItems).mockResolvedValue(feedItems);

          const readItemSpy = spy(ReadItemIntentHandler);
          when(readItemSpy.handle(anything())).thenCall(() => {});

          await ReadIntentHandler.handle(mocks.instanceHandlerInput);

          expect(getItems).toHaveBeenLastCalledWith(feed, locale);

          expect(sessionAttributes.readState).toMatchObject({
            feedName: feed.name,
            feed,
            feedItems,
          });

          verify(readItemSpy.handle(mocks.instanceHandlerInput)).once();
        }
      )
    )
  );
});
