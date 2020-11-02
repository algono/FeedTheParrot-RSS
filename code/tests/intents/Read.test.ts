import { getLocale, getSlotValue, HandlerInput } from 'ask-sdk-core';
import {
  IntentConfirmationStatus,
  Slot,
  SlotConfirmationStatus,
} from 'ask-sdk-model';
import fc from 'fast-check';
import { mocked } from 'ts-jest/utils';
import {
  anyString,
  anything,
  deepEqual,
  instance,
  mock,
  reset,
  spy,
  verify,
  when,
} from 'ts-mockito';
import {
  GoToPreviousItemIntentHandler,
  ReadContentIntentHandler,
  ReadIntentHandler,
  ReadItemIntentHandler,
  ReadState,
  SkipItemIntentHandler,
} from '../../src/intents/Read';
import { mockHandlerInput } from '../helpers/HandlerInputMocks';
import { testInAllLocales, testIntentCanHandle } from '../helpers/helperTests';
import { mockProperty } from '../helpers/ts-mockito/mockProperty';
import { mockIntent } from '../helpers/mockIntent';
import { feedSlotName } from '../../src/util/constants';
import { Feed, FeedItem, getItems } from '../../src/logic/Feed';
import { feedItemRecord, feedRecord } from '../helpers/fast-check/arbitraries';

jest.mock('ask-sdk-core');
testIntentCanHandle({
  handler: ReadIntentHandler,
  intentName: 'ReadIntent',
});

test('ReadIntent - If the feed name has not been received yet, let Alexa continue the dialogue', async () => {
  const mocks = await mockHandlerInput();

  mocked(getSlotValue).mockReturnValue(undefined);

  const { intentMock } = mockIntent();

  await ReadIntentHandler.handle(mocks.instanceHandlerInput);

  verify(mocks.mockedResponseBuilder.speak(anyString())).never();

  verify(
    mocks.mockedResponseBuilder.addDelegateDirective(instance(intentMock))
  ).once();
});

jest.mock('../../src/logic/Feed');

test('ReadIntent - If the feed is not on our list, invalidate the feed name given, warn the user and try again', () =>
  fc.assert(
    fc.asyncProperty(
      fc.array(fc.string()),
      fc.string({ minLength: 1 }),
      async (feedNames, feedName) => {
        fc.pre(!feedNames.includes(feedName));

        const mocks = await mockHandlerInput({
          sessionAttributes: {
            feedNames,
          },
        });

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
          mocks.mockedResponseBuilder.addDelegateDirective(instance(intentMock))
        ).once();
      }
    )
  ));

testInAllLocales(
  "ReadIntent - Gets items from feed with Alexa's locale, stores a ReadState and starts reading items",
  (locale) =>
    fc.assert(
      fc.asyncProperty(
        fc
          .tuple(
            fc.set(feedRecord, {
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
        fc.array(feedItemRecord),
        async (
          {
            feeds,
            feedNames,
            feed,
          }: { feeds: { [x: string]: Feed }; feedNames: string[]; feed: Feed },
          feedItems: FeedItem[]
        ) => {
          const sessionAttributes: {
            feeds: { [x: string]: Feed };
            feedNames: string[];
            readState?: ReadState;
          } = {
            feeds,
            feedNames,
          };

          const mocks = await mockHandlerInput({
            locale,
            sessionAttributes,
          });

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

describe('Read intents when reading', () => {
  const readStateMock = mock<ReadState>();
  when(readStateMock.reading).thenReturn(true);

  beforeEach(() => {
    reset(readStateMock);
    when(readStateMock.reading).thenReturn(true);
  });

  const sessionAttributesWhenReading: {
    readState: ReadState;
  } = { readState: instance(readStateMock) };

  testIntentCanHandle({
    handler: ReadItemIntentHandler,
    intentName: 'ReadItemIntent',
    mockHandlerInputOptions: {
      sessionAttributes: sessionAttributesWhenReading,
    },
  });

  testIntentCanHandle({
    handler: ReadItemIntentHandler,
    intentName: 'AMAZON.RepeatIntent',
    mockHandlerInputOptions: {
      sessionAttributes: sessionAttributesWhenReading,
    },
  });

  test.todo(
    'ReadItemIntent - If there are items to read, start reading, read the item title and ask for confirmation to continue reading'
  );

  test.todo(
    'ReadItemIntent - If it was reading content before, delete its temp data from session attributes'
  );

  test.todo(
    'ReadItemIntent - If it was reading before, add a pause before reading the current item'
  );

  test.todo(
    'ReadItemIntent - If there are no items left, tell the user and stop reading'
  );

  testIntentCanHandle({
    handler: ReadContentIntentHandler,
    intentName: 'AMAZON.YesIntent',
    mockHandlerInputOptions: {
      sessionAttributes: sessionAttributesWhenReading,
    },
  });

  test.todo(
    'ReadContentIntent - If it is any content item but the last one, prompt for continuing reading the next'
  );

  test.todo(
    'ReadContentIntent - If there are no other items to continue to, prompt for going to the next item'
  );

  test('ReadContentIntent - If the intent was denied, go to the next item', () =>
    checkIfOnConfirmationStatus(
      {
        DENIED: true,
      },
      async (shouldBeTrue) => {
        const mocks = await mockHandlerInput({ sessionAttributes: {} });

        await ReadContentIntentHandler.handle(mocks.instanceHandlerInput);

        const verificator = verify(
          mocks.mockedResponseBuilder.addDelegateDirective(
            deepEqual({
              name: 'AMAZON.NextIntent',
              confirmationStatus: 'CONFIRMED',
            })
          )
        );

        if (shouldBeTrue) {
          verificator.once();
        } else {
          verificator.never();
        }
      }
    ));

  testIntentCanHandle({
    handler: GoToPreviousItemIntentHandler,
    intentName: 'AMAZON.PreviousIntent',
    mockHandlerInputOptions: {
      sessionAttributes: sessionAttributesWhenReading,
    },
  });

  async function checkIfItReadsItemAfterMovingIndexBy(
    fn: { (handlerInput: HandlerInput): unknown | Promise<unknown> },
    n: number,
    shouldBeTrue = true
  ) {
    await fc.assert(
      fc.asyncProperty(
        // min value so that initial AND final indexes are never negative
        fc.integer({ min: n < 0 ? Math.abs(n) : 0 }),
        async (index) => {
          const readState = instance(readStateMock);

          mockProperty(
            readState,
            'currentIndex',
            () => index,
            (value) => {
              if (shouldBeTrue) {
                expect(value).toEqual(index + n);
              } else {
                fail('currentIndex should not have been changed');
              }
            }
          );

          const sessionAttributes: {
            readState: ReadState;
          } = {
            readState,
          };

          const mocks = await mockHandlerInput({
            sessionAttributes,
          });

          const readItemSpy = spy(ReadItemIntentHandler);
          when(readItemSpy.handle(anything())).thenCall(() => {});

          await fn(mocks.instanceHandlerInput);

          if (shouldBeTrue) {
            verify(readItemSpy.handle(mocks.instanceHandlerInput)).once();
          } else {
            verify(readItemSpy.handle(mocks.instanceHandlerInput)).never();
          }
        }
      )
    );
  }

  test('PreviousIntent (item) - Go to the previous item and read it', () =>
    checkIfItReadsItemAfterMovingIndexBy(
      GoToPreviousItemIntentHandler.handle,
      -1
    ));

  testIntentCanHandle({
    handler: SkipItemIntentHandler,
    intentName: 'AMAZON.NoIntent',
    mockHandlerInputOptions: {
      sessionAttributes: sessionAttributesWhenReading,
    },
  });

  testIntentCanHandle({
    handler: SkipItemIntentHandler,
    intentName: 'AMAZON.NextIntent',
    mockHandlerInputOptions: {
      sessionAttributes: sessionAttributesWhenReading,
    },
  });

  test('NextIntent (item) - If the intent was not denied, go to the next item and read it', () =>
    checkIfOnConfirmationStatus(
      {
        NONE: true,
        CONFIRMED: true,
      },
      (shouldBeTrue) =>
        checkIfItReadsItemAfterMovingIndexBy(
          SkipItemIntentHandler.handle,
          1,
          shouldBeTrue
        )
    ));

  test('NextIntent (item) - If the intent was denied, cancel reading', () =>
    checkIfOnConfirmationStatus(
      {
        DENIED: true,
      },
      async (shouldBeTrue) => {
        const mocks = await mockHandlerInput({
          sessionAttributes: {
            readState: instance(readStateMock),
          },
        });

        const readItemSpy = spy(ReadItemIntentHandler);
        when(readItemSpy.handle(anything())).thenCall(() => {});

        await SkipItemIntentHandler.handle(mocks.instanceHandlerInput);

        const verificator = verify(
          mocks.mockedResponseBuilder.addDelegateDirective(
            deepEqual({
              name: 'AMAZON.CancelIntent',
              confirmationStatus: anyString(),
            })
          )
        );

        if (shouldBeTrue) {
          verificator.once();
        } else {
          verificator.never();
        }
      }
    ));
});

async function checkIfOnConfirmationStatus(
  allowedConfirmationStatuses: {
    [key in IntentConfirmationStatus]?: boolean;
  },
  fn: (shouldBeTrue?: boolean) => unknown | Promise<unknown>
) {
  const { intentMock } = mockIntent();

  for (const confirmationStatus in allowedConfirmationStatuses) {
    reset(intentMock);
    when(intentMock.confirmationStatus).thenReturn(
      confirmationStatus as IntentConfirmationStatus
    );

    const shouldBeTrue: boolean =
      allowedConfirmationStatuses[confirmationStatus];

    await fn(shouldBeTrue);
  }
}
