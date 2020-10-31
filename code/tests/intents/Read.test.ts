import { instance, mock, when } from 'ts-mockito';
import {
  GoToPreviousItemIntentHandler,
  ReadContentIntentHandler,
  ReadIntentHandler,
  ReadItemIntentHandler,
  ReadState,
  SkipItemIntentHandler,
} from '../../src/intents/Read';
import { testIntentCanHandle } from '../helpers/helperTests';

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

const mockReadState = mock<ReadState>();
when(mockReadState.reading).thenReturn(true);

const readStateWhenReading = instance(mockReadState);

const sessionAttributesWhenReading = { readState: readStateWhenReading };

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

test.todo(
  'PreviousIntent (item) - Go to the previous item and read it'
);

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

test.todo(
  'NextIntent (item) - Go to the next item and read it'
);

test.todo(
  'NextIntent (item) - If the intent was denied, cancel reading'
);
