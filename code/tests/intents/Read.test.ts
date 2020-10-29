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

testIntentCanHandle({
  handler: ReadContentIntentHandler,
  intentName: 'AMAZON.YesIntent',
  mockHandlerInputOptions: {
    sessionAttributes: sessionAttributesWhenReading,
  },
});

testIntentCanHandle({
  handler: GoToPreviousItemIntentHandler,
  intentName: 'AMAZON.PreviousIntent',
  mockHandlerInputOptions: {
    sessionAttributes: sessionAttributesWhenReading,
  },
});

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
