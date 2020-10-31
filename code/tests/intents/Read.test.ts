import { getRequest, HandlerInput } from 'ask-sdk-core';
import { Intent, IntentConfirmationStatus, IntentRequest } from 'ask-sdk-model';
import fc from 'fast-check';
import { mocked } from 'ts-jest/utils';
import { anything, instance, mock, reset, spy, verify, when } from 'ts-mockito';
import {
  GoToPreviousItemIntentHandler,
  ReadContentIntentHandler,
  ReadIntentHandler,
  ReadItemIntentHandler,
  ReadState,
  SkipItemIntentHandler,
} from '../../src/intents/Read';
import { mockHandlerInput } from '../helpers/HandlerInputMocks';
import { testIntentCanHandle } from '../helpers/helperTests';
import { mockProperty } from '../helpers/ts-mockito/mockProperty';

jest.mock('ask-sdk-core');
testIntentCanHandle({
  handler: ReadIntentHandler,
  intentName: 'ReadIntent',
});

test.todo(
  'ReadIntent - If the feed name has not been received yet, let Alexa continue the dialogue'
);

test.todo(
  'ReadIntent - If the feed is not on our list, return and warn the user'
);

test.todo(
  "ReadIntent - Gets items from feed with Alexa's locale, stores a ReadState and starts reading items"
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
    'ReadContentIntent - If it is any content item but the last one, prompt for continue reading the next'
  );

  test.todo(
    'ReadContentIntent - If there are no other items to continue to, go to the next item'
  );

  test.todo(
    'ReadContentIntent - If the intent was denied, go to the next item'
  );

  testIntentCanHandle({
    handler: GoToPreviousItemIntentHandler,
    intentName: 'AMAZON.PreviousIntent',
    mockHandlerInputOptions: {
      sessionAttributes: sessionAttributesWhenReading,
    },
  });

  async function checkIfItReadsItemAfterMovingIndexBy(
    fn: { (handlerInput: HandlerInput): any | Promise<any> },
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
            sessionAttributes: sessionAttributes,
          });

          const readItemSpy = spy(ReadItemIntentHandler);
          when(readItemSpy.handle(anything())).thenCall(() => {});

          await fn(mocks.instanceHandlerInput);

          if (shouldBeTrue) {
            verify(readItemSpy.handle(anything())).once();
          } else {
            verify(readItemSpy.handle(anything())).never();
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

  test('NextIntent (item) - If the intent was not denied, go to the next item and read it', async () => {
    const allowedConfirmationStatuses: {
      [key in IntentConfirmationStatus]: boolean;
    } = {
      NONE: true,
      CONFIRMED: true,
      DENIED: false,
    };

    const intentRequestMock = mock<IntentRequest>();

    const intentMock = mock<Intent>();

    when(intentRequestMock.intent).thenCall(() => instance(intentMock));

    mocked(getRequest).mockImplementation(() => instance(intentRequestMock));

    for (const confirmationStatus in allowedConfirmationStatuses) {
      reset(intentMock);
      when(intentMock.confirmationStatus).thenReturn(
        confirmationStatus as IntentConfirmationStatus
      );

      const shouldBeTrue: boolean =
        allowedConfirmationStatuses[confirmationStatus];

      await checkIfItReadsItemAfterMovingIndexBy(
        SkipItemIntentHandler.handle,
        1,
        shouldBeTrue
      );
    }
  });

  test.todo('NextIntent (item) - If the intent was denied, cancel reading');
});
