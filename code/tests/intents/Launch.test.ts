import { LaunchRequestHandler } from '../../src/intents/Launch';
import { testCanHandle } from '../helpers/helperTests';

jest.mock('firebase-admin', () => ({
  firestore: () => null,
}));

jest.mock('ask-sdk-core');
testCanHandle({
  handler: LaunchRequestHandler,
  requestType: 'LaunchRequest',
  testName: 'Launch request can be handled when called',
});
