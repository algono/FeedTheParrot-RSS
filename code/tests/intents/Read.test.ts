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
} from '../../src/intents/Read';
import { mockHandlerInput } from '../helpers/mocks/HandlerInputMocks';
import { testInAllLocales, testIntentCanHandle } from '../helpers/helperTests';
import { mockProperty } from '../helpers/ts-mockito/mockProperty';
import { mockIntent } from '../helpers/mocks/mockIntent';
import { feedItemsRecord } from '../helpers/fast-check/arbitraries';
import { escapeRegex } from '../helpers/escapeRegex';

function mockReadState({ mockReadingSetter = false } = {}) {
  const readStateMock = mock<ReadState>();
  let readState: ReadState;

  if (mockReadingSetter) {
    readState = instance(readStateMock);
    mockProperty(
      readState,
      'reading',
      () => true,
      () => {}
    );
  } else {
    when(readStateMock.reading).thenReturn(true);
    readState = instance(readStateMock);
  }

  return { readStateMock, readState };
}

const sessionAttributesWhenReading: {
  readState: ReadState;
} = { readState: mockReadState().readState };

jest.mock('ask-sdk-core');

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

test('ReadItemIntent - If it was reading content before, delete its temp data from session attributes', () =>
  fc.assert(
    fc.asyncProperty(
      fc.oneof(fc.nat(), fc.constant(undefined)),
      async (currentContentIndex) => {
        const { readState } = mockReadState({ mockReadingSetter: true });

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

testInAllLocales(
  'ReadContentIntent - If it is any content item but the last one, read it, move index by one and prompt for continue reading the next one',
  async (locale) => {
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
              reading: true,
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
  }
);

testInAllLocales(
  'ReadContentIntent - If it is the last content item, read it and prompt for going to the next item',
  async (locale) => {
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
              reading: true,
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
  }
);

testInAllLocales(
  'ReadContentIntent - If there are no other items to continue to (or the index is not valid), prompt for going to the next item',
  (locale) =>
    fc.assert(
      fc.asyncProperty(
        fc
          .tuple(
            feedItemsRecord({ minLength: 1, reading: true }),
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
        async (
          { feedItems, currentIndex, currentContentIndex },
          confirmationStatus
        ) => {
          const { readStateMock } = mockReadState();

          when(readStateMock.feedItems).thenReturn(feedItems);
          when(readStateMock.currentIndex).thenReturn(currentIndex);
          when(readStateMock.currentContentIndex).thenReturn(
            currentContentIndex
          );

          const mocks = await mockHandlerInput({
            locale,
            sessionAttributes: { readState: instance(readStateMock) },
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
