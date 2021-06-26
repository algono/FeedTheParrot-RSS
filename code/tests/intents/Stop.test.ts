import { CancelAndStopIntentHandler } from '../../src/intents/Stop';
import { testIntentCanHandle } from '../helpers/helperTests';

jest.mock('ask-sdk-core');

describe('Cancel and stop intent', () => {
  testIntentCanHandle({
    handler: CancelAndStopIntentHandler,
    intentName: 'AMAZON.CancelIntent',
  });
  testIntentCanHandle({
    handler: CancelAndStopIntentHandler,
    intentName: 'AMAZON.StopIntent',
  });
});
