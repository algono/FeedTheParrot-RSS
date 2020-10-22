import { AuthIntentHandler } from '../../src/intents/Auth';
import { testIntentCanHandle } from '../helpers/helperTests';

jest.mock('../../src/database/Database', () => {});

jest.mock('ask-sdk-core');
testIntentCanHandle({
  handler: AuthIntentHandler,
  intentName: 'AuthIntent',
});
