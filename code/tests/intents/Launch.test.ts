import { LaunchRequestHandler } from '../../src/intents/Launch';
import { testCanHandle } from '../helpers/helperTests';

jest.mock('../../src/database/Database', () => {});

jest.mock('ask-sdk-core');
testCanHandle({
  handler: LaunchRequestHandler,
  requestType: 'LaunchRequest',
  testName: 'Launch request can be handled when called',
});
