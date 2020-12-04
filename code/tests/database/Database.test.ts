import { initializeApp } from 'firebase-admin';
import { mocked } from 'ts-jest/utils';
import { verify } from 'ts-mockito';
import { createPersistenceAdapter } from '../helpers/mocks/mockDatabase';

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  firestore: jest.fn(),
  credential: {
    cert: jest.fn(),
  },
}));

jest.mock('../../src/database/firebaseServiceAccountKey', () => null);

test('Creating a new persistence adapter initializes the database', () => {
  const { appMock } = createPersistenceAdapter();

  expect(mocked(initializeApp)).toHaveBeenCalled();
  verify(appMock.firestore()).once();
});

describe('setAuthCode', () => {
  test.todo('if the user does not exist, it creates a new one');

  test.todo(
    'if the user exists, sets the code in a document with the same id as the user in auth codes collection'
  );
});

describe('getUserData', () => {
  test.todo('throws an error if the user does not exist');

  test.todo('retrieves user data (based on locale) and ref if it exists');
});
