import { AttributesManager } from 'ask-sdk-core';
import { app, initializeApp } from 'firebase-admin';
import { mocked } from 'ts-jest/utils';
import { anything, instance, mock, when } from 'ts-mockito';
import { Database, DatabaseHandler } from '../../../src/database/Database';
import { FirebaseWithDynamoDbPersistenceAdapter } from '../../../src/database/FirebaseWithDynamoDbPersistenceAdapter';
import { UserData } from '../../../src/database/UserData';
import { TFunction } from '../../../src/util/localization';
import { mockHandlerInput } from './HandlerInputMocks';
import { mockDocumentClient } from './mockDynamoDb';

export function mockDatabase() {
  const mockedDatabase = mock<DatabaseHandler>();
  jest
    .spyOn(Database, 'use')
    .mockImplementation(() => instance(mockedDatabase));
  return mockedDatabase;
}

export async function createPersistenceAdapter(initDynamoDb: boolean = false) {
  const appMock = mock<app.App>();

  const firestoreMock = mock<FirebaseFirestore.Firestore>();
  when(appMock.firestore()).thenCall(() => instance(firestoreMock));

  mocked(initializeApp).mockImplementation(() => instance(appMock));

  const { clientMock, stsMock } = mockDocumentClient();

  const persistenceAdapter = new FirebaseWithDynamoDbPersistenceAdapter();

  if (initDynamoDb) await persistenceAdapter.initDynamoDb();

  return {
    persistenceAdapter,
    appMock,
    firestoreMock,
    clientMock,
    stsMock,
  };
}

export interface CreateDatabaseHandlerResult {
  firestoreMock: FirebaseFirestore.Firestore;
  clientMock: AWS.DynamoDB.DocumentClient;
  stsMock: AWS.STS;
  mockedAttributesManager: AttributesManager;
  attributesManager: AttributesManager;
  persistentAttributesHolder: {
    attributes?: UserData;
  };
  databaseHandler: DatabaseHandler;
  t: TFunction;
}

export async function createDatabaseHandler({
  locale,
  sessionAttributes,
  initDynamoDb = false,
}: {
  locale?: string;
  sessionAttributes?: { [key: string]: any };
  initDynamoDb?: boolean;
} = {}): Promise<CreateDatabaseHandlerResult> {
  const { persistenceAdapter, firestoreMock, clientMock, stsMock } =
    await createPersistenceAdapter(initDynamoDb);

  const { mockedAttributesManager, instanceRequestEnvelope, t } =
    await mockHandlerInput({ locale, sessionAttributes });

  const persistentAttributesHolder: { attributes?: UserData } = {};

  when(mockedAttributesManager.getPersistentAttributes()).thenCall(async () =>
    persistentAttributesHolder.attributes !== undefined
      ? Promise.resolve(persistentAttributesHolder.attributes)
      : (persistentAttributesHolder.attributes =
          await persistenceAdapter.getAttributes(instanceRequestEnvelope))
  );

  when(mockedAttributesManager.setPersistentAttributes(anything())).thenCall(
    (attributes) => {
      persistentAttributesHolder.attributes = attributes;
    }
  );

  when(mockedAttributesManager.savePersistentAttributes()).thenCall(() =>
    persistenceAdapter.saveAttributes(
      instanceRequestEnvelope,
      persistentAttributesHolder.attributes
    )
  );

  const attributesManager = instance(mockedAttributesManager);
  const databaseHandler = Database.use(attributesManager);

  return {
    firestoreMock,
    clientMock,
    stsMock,
    mockedAttributesManager,
    attributesManager,
    persistentAttributesHolder,
    databaseHandler,
    t,
  };
}
