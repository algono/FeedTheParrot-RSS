import { AuthIntentHandler } from '../../src/intents/Auth';
import { testIntentCanHandle } from '../helpers/helperTests';

jest.mock('firebase-admin', () => ({
  firestore: () => null,
}));

jest.mock('ask-sdk-core');
testIntentCanHandle({
  handler: AuthIntentHandler,
  intentName: 'AuthIntent',
});
