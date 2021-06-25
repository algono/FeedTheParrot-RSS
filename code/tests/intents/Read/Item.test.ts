import { HandlerInput } from 'ask-sdk-core';
import { IntentConfirmationStatus } from 'ask-sdk-model';
import fc from 'fast-check';
import {
  anyString,
  anything,
  capture,
  deepEqual,
  instance,
  mock,
  reset,
  resetCalls,
  spy,
  verify,
  when,
} from 'ts-mockito';
import {
  GoToPreviousItemIntentHandler,
  ReadContentIntentHandler,
  ReadItemIntentHandler,
  ReadState,
  SkipItemIntentHandler,
} from '../../../src/intents/Read/Item';
import { mockHandlerInput } from '../../helpers/mocks/HandlerInputMocks';
import {
  testInAllLocales,
  testIntentCanHandle,
} from '../../helpers/helperTests';
import { mockProperty } from '../../helpers/ts-mockito/mockProperty';
import { mockIntent } from '../../helpers/mocks/mockIntent';
import { feedItemsRecord } from '../../helpers/fast-check/arbitraries/feed';
import { escapeRegex } from '../../helpers/escapeRegex';
import { PAUSE_BETWEEN_ITEMS } from '../../../src/util/constants';
import { FeedItem, FeedItems } from '../../../src/logic/Feed';

function mockReadState({
  reading = true,
  mockReadingSetter,
}: { reading?: boolean; mockReadingSetter?: { (value: boolean): void } } = {}) {
  const readStateMock = mock<ReadState>();
  let readState: ReadState;
  let propertyMocks: {
    getterSpy: jest.SpyInstance<boolean, []>;
    setterSpy: jest.SpyInstance<void, boolean[]>;
  };

  const feedItemsMock = mock<FeedItems>();

  when(feedItemsMock.list).thenReturn([]);

  when(readStateMock.feedItems).thenCall(() => instance(feedItemsMock));

  if (mockReadingSetter) {
    readState = instance(readStateMock);
    propertyMocks = mockProperty(
      readState,
      'reading',
      () => reading,
      mockReadingSetter
    );
  } else {
    when(readStateMock.reading).thenReturn(reading);
    readState = instance(readStateMock);
  }

  return { readStateMock, readState, ...propertyMocks, feedItemsMock };
}

const sessionAttributesWhenReading: {
  readState: ReadState;
} = { readState: mockReadState().readState };

jest.mock('ask-sdk-core');

describe('ReadItemIntent', () => {
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

  testInAllLocales(
    'If there are items to read, start reading, read the item title and ask for confirmation to continue reading'
  )(async (locale) => {
    const sessionAttributes: { readState?: ReadState } = {};
    const mocks = await mockHandlerInput({
      locale,
      sessionAttributes,
    });
    await fc.assert(
      fc.asyncProperty(
        fc
          .tuple(
            feedItemsRecord({
              minLength: 1,
              readingContent: true,
              t: mocks.t,
            }),
            fc.nat()
          )
          .map(([feedItems, currentIndex]) => ({
            feedItems,
            currentIndex: currentIndex % feedItems.list.length,
          })),
        async ({ feedItems, currentIndex }) => {
          resetCalls<unknown>(
            mocks.mockedHandlerInput,
            mocks.mockedAttributesManager,
            mocks.mockedResponseBuilder,
            mocks.mockedResponse
          );

          const { readStateMock } = mockReadState({
            mockReadingSetter: () => {},
          });

          when(readStateMock.feedItems).thenReturn(feedItems);
          when(readStateMock.currentIndex).thenReturn(currentIndex);

          sessionAttributes.readState = instance(readStateMock);

          await ReadItemIntentHandler.handle(mocks.instanceHandlerInput);

          const [speakOutput] = capture(
            mocks.mockedResponseBuilder.speak
          ).last();

          const item = feedItems.list[currentIndex];

          expect(speakOutput).toMatch(
            new RegExp(
              `^.*?${escapeRegex(item.title)}.*?${escapeRegex(
                mocks.t('CONFIRMATION_CONTINUE_READING_FEED')
              )}$`,
              's'
            )
          );

          verify(mocks.mockedResponseBuilder.reprompt(speakOutput)).once();
        }
      )
    );
  });

  test('If it was reading content before, delete its temp data from session attributes', () =>
    fc.assert(
      fc.asyncProperty(
        fc.oneof(fc.nat(), fc.constant(undefined)),
        async (currentContentIndex) => {
          const { readState } = mockReadState({ mockReadingSetter: () => {} });

          mockProperty(
            readState,
            'currentContentIndex',
            () => currentContentIndex,
            (value) => expect(value).toBeUndefined()
          );

          const sessionAttributes = { readState };
          const mocks = await mockHandlerInput({
            locale: null,
            sessionAttributes,
          });

          await ReadItemIntentHandler.handle(mocks.instanceHandlerInput);

          const indexProperty: keyof ReadState = 'currentContentIndex';
          expect(indexProperty in sessionAttributes.readState).toBe(false);
        }
      )
    ));

  test('If it was reading before, add a pause before reading the current item', async () => {
    const { readState } = mockReadState({ mockReadingSetter: () => {} });

    const sessionAttributes = { readState };
    const mocks = await mockHandlerInput({
      locale: null,
      sessionAttributes,
    });

    await ReadItemIntentHandler.handle(mocks.instanceHandlerInput);

    const [speakOutput] = capture(mocks.mockedResponseBuilder.speak).last();

    expect(speakOutput.startsWith(PAUSE_BETWEEN_ITEMS)).toBe(true);
  });

  testInAllLocales(
    'If there are no items left, tell the user and stop reading'
  )((locale) =>
    fc.assert(
      fc.asyncProperty(
        fc
          .integer({ min: 1 })
          .chain((itemsLength) =>
            fc.tuple(fc.constant(itemsLength), fc.integer({ min: itemsLength }))
          ),
        async ([itemsLength, currentIndex]) => {
          await testReadingEnd(locale, true, itemsLength, currentIndex);
          await testReadingEnd(locale, false, itemsLength, currentIndex);
        }
      )
    )
  );

  testInAllLocales('If the feed is empty, tell the user and stop reading')(
    async (locale) => {
      await testReadingEnd(locale, true, 0);
      await testReadingEnd(locale, false, 0);
    }
  );

  async function testReadingEnd(
    locale: string,
    reading: boolean,
    itemsLength: number,
    currentIndex?: number
  ) {
    const { readStateMock, setterSpy, feedItemsMock } = mockReadState({
      reading,
      mockReadingSetter: () => {},
    });

    const itemsListMock = mock<FeedItem[]>();
    when(itemsListMock.length).thenReturn(itemsLength);

    when(feedItemsMock.list).thenCall(() => instance(itemsListMock));

    when(readStateMock.currentIndex).thenReturn(currentIndex);

    const sessionAttributes = { readState: instance(readStateMock) };
    const mocks = await mockHandlerInput({
      locale,
      sessionAttributes,
    });

    await ReadItemIntentHandler.handle(mocks.instanceHandlerInput);

    expect(setterSpy).lastCalledWith(false);

    const [speakOutput] = capture(mocks.mockedResponseBuilder.speak).last();

    expect(speakOutput).toContain(
      mocks.t(itemsLength === 0 ? 'EMPTY_FEED_MSG' : 'END_READING_FEED')
    );
  }
});

describe('ReadContentIntent', () => {
  testIntentCanHandle({
    handler: ReadContentIntentHandler,
    intentName: 'AMAZON.YesIntent',
    mockHandlerInputOptions: {
      sessionAttributes: sessionAttributesWhenReading,
    },
  });

  testInAllLocales(
    'If it is any content item but the last one, read it, move index by one and prompt for continue reading the next one'
  )(async (locale) => {
    const sessionAttributes: { readState?: ReadState } = {};
    const mocks = await mockHandlerInput({
      locale,
      sessionAttributes,
    });

    await fc.assert(
      fc.asyncProperty(
        fc
          .tuple(
            feedItemsRecord({
              minLength: 1,
              readingContent: true,
              contentMinLength: 2,
              t: mocks.t,
            }),
            fc.nat(),
            fc.option(fc.nat())
          )
          .map(([feedItems, currentIndex, currentContentIndex]) => {
            currentIndex %= feedItems.list.length;
            const contentLength = feedItems.list[currentIndex].content.length;

            return {
              feedItems,
              currentIndex,
              currentContentIndex: currentContentIndex
                ? currentContentIndex % (contentLength - 1)
                : undefined,
            };
          }),
        fc.constantFrom<IntentConfirmationStatus[]>('NONE', 'CONFIRMED'),
        fc.oneof(fc.boolean(), fc.constant(undefined)),
        async (
          { feedItems, currentIndex, currentContentIndex },
          confirmationStatus,
          listenToPodcast
        ) => {
          resetCalls<unknown>(
            mocks.mockedHandlerInput,
            mocks.mockedAttributesManager,
            mocks.mockedResponseBuilder,
            mocks.mockedResponse
          );

          const { readStateMock } = mockReadState();

          when(readStateMock.feedItems).thenReturn(feedItems);
          when(readStateMock.currentIndex).thenReturn(currentIndex);
          when(readStateMock.listenToPodcast).thenReturn(listenToPodcast);

          sessionAttributes.readState = instance(readStateMock);

          mockProperty(
            sessionAttributes.readState,
            'currentContentIndex',
            () => currentContentIndex,
            (value) => expect(value).toEqual((currentContentIndex ?? 0) + 1)
          );

          const { intentMock } = mockIntent();
          when(intentMock.confirmationStatus).thenReturn(confirmationStatus);

          await ReadContentIntentHandler.handle(mocks.instanceHandlerInput);

          const [speakOutput] = capture(
            mocks.mockedResponseBuilder.speak
          ).last();

          const feedItem = feedItems.list[currentIndex];
          const currentContent = feedItem.content[currentContentIndex ?? 0];

          expect(speakOutput).toMatch(
            new RegExp(
              `^.*?${escapeRegex(currentContent)}.*?${escapeRegex(
                mocks.t('CONFIRMATION_CONTINUE_READING_FEED')
              )}$`,
              's'
            )
          );

          verify(
            mocks.mockedResponseBuilder.withStandardCard(
              feedItem.title,
              currentContent,
              feedItem.imageUrl
            )
          ).once();

          verify(
            mocks.mockedResponseBuilder.addConfirmIntentDirective(
              deepEqual({
                name: 'AMAZON.YesIntent',
                confirmationStatus: 'NONE',
              })
            )
          ).once();
        }
      )
    );
  });

  testInAllLocales(
    'If it is the last content item, read it and prompt for going to the next item'
  )(async (locale) => {
    const sessionAttributes: { readState?: ReadState } = {};
    const mocks = await mockHandlerInput({
      locale,
      sessionAttributes,
    });
    await fc.assert(
      fc.asyncProperty(
        fc
          .tuple(
            feedItemsRecord({
              minLength: 1,
              readingContent: true,
              contentMinLength: 1,
              t: mocks.t,
            }),
            fc.nat(),
            fc.boolean()
          )
          .map(([feedItems, currentIndex, isCurrentContentIndexDefined]) => {
            currentIndex %= feedItems.list.length;
            const contentLength = feedItems.list[currentIndex].content.length;

            return {
              feedItems,
              currentIndex,
              currentContentIndex:
                contentLength == 1 && !isCurrentContentIndexDefined
                  ? undefined
                  : contentLength - 1,
            };
          }),
        fc.constantFrom<IntentConfirmationStatus[]>('NONE', 'CONFIRMED'),
        async (
          { feedItems, currentIndex, currentContentIndex },
          confirmationStatus
        ) => {
          resetCalls<unknown>(
            mocks.mockedHandlerInput,
            mocks.mockedAttributesManager,
            mocks.mockedResponseBuilder,
            mocks.mockedResponse
          );

          const { readStateMock } = mockReadState();

          when(readStateMock.feedItems).thenReturn(feedItems);
          when(readStateMock.currentIndex).thenReturn(currentIndex);
          when(readStateMock.currentContentIndex).thenReturn(
            currentContentIndex
          );

          sessionAttributes.readState = instance(readStateMock);

          const { intentMock } = mockIntent();
          when(intentMock.confirmationStatus).thenReturn(confirmationStatus);

          await ReadContentIntentHandler.handle(mocks.instanceHandlerInput);

          const [speakOutput] = capture(
            mocks.mockedResponseBuilder.speak
          ).last();

          const feedItem = feedItems.list[currentIndex];
          const currentContent = feedItem.content[currentContentIndex ?? 0];

          expect(speakOutput).toMatch(
            new RegExp(
              `^.*?${escapeRegex(currentContent)}.*?${escapeRegex(
                mocks.t('CONFIRMATION_GOTO_NEXT_FEED_ITEM')
              )}$`,
              's'
            )
          );

          verify(
            mocks.mockedResponseBuilder.withStandardCard(
              feedItem.title,
              currentContent,
              feedItem.imageUrl
            )
          ).once();

          verify(
            mocks.mockedResponseBuilder.addConfirmIntentDirective(
              deepEqual({
                name: 'AMAZON.NextIntent',
                confirmationStatus: 'NONE',
              })
            )
          ).once();
        }
      )
    );
  });

  testInAllLocales(
    'If there are no other items to continue to (or the index is not valid), prompt for going to the next item'
  )((locale) =>
    fc.assert(
      fc.asyncProperty(
        fc
          .tuple(
            feedItemsRecord({ minLength: 1, readingContent: true }),
            fc.nat(),
            fc.integer()
          )
          .map(([feedItems, currentIndex, currentContentIndex]) => {
            currentIndex %= feedItems.list.length;

            const contentLength = feedItems.list[currentIndex].content.length;

            if (
              currentContentIndex >= 0 &&
              currentContentIndex < contentLength
            ) {
              currentContentIndex += contentLength;
            }

            return {
              feedItems,
              currentIndex,
              currentContentIndex,
            };
          }),
        fc.constantFrom<IntentConfirmationStatus[]>('NONE', 'CONFIRMED'),
        fc.oneof(fc.boolean(), fc.constant(undefined)),
        async (
          { feedItems, currentIndex, currentContentIndex },
          confirmationStatus,
          listenToPodcast
        ) => {
          const { readStateMock } = mockReadState();

          when(readStateMock.feedItems).thenReturn(feedItems);
          when(readStateMock.currentIndex).thenReturn(currentIndex);
          when(readStateMock.currentContentIndex).thenReturn(
            currentContentIndex
          );

          const sessionAttributes = {
            readState: instance(readStateMock),
          };

          mockProperty(
            sessionAttributes.readState,
            'listenToPodcast',
            () => listenToPodcast,
            () => null
          );

          const mocks = await mockHandlerInput({
            locale,
            sessionAttributes,
          });

          const { intentMock } = mockIntent();
          when(intentMock.confirmationStatus).thenReturn(confirmationStatus);

          await ReadContentIntentHandler.handle(mocks.instanceHandlerInput);

          verify(
            mocks.mockedResponseBuilder.speak(
              mocks.t('CONFIRMATION_GOTO_NEXT_FEED_ITEM')
            )
          ).once();

          verify(
            mocks.mockedResponseBuilder.withStandardCard(
              anyString(),
              anyString(),
              anyString()
            )
          ).never();

          verify(
            mocks.mockedResponseBuilder.addConfirmIntentDirective(
              deepEqual({
                name: 'AMAZON.NextIntent',
                confirmationStatus: 'NONE',
              })
            )
          ).once();
        }
      )
    )
  );
});

describe('GoToPreviousItemIntent', () => {
  testIntentCanHandle({
    handler: GoToPreviousItemIntentHandler,
    intentName: 'AMAZON.PreviousIntent',
    mockHandlerInputOptions: {
      sessionAttributes: sessionAttributesWhenReading,
    },
  });

  test('Go to the previous item and read it', () =>
    checkIfItReadsItemAfterMovingIndexBy(
      GoToPreviousItemIntentHandler.handle,
      -1
    ));
});

describe('SkipItemIntent', () => {
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

  test('If the intent was not denied, go to the next item and read it', () =>
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

  test('If the intent was denied, cancel reading', () =>
    checkIfOnConfirmationStatus(
      {
        DENIED: true,
      },
      async (shouldBeTrue) => {
        const readStateMock = mockReadState();
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
        const { readState } = mockReadState();

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
