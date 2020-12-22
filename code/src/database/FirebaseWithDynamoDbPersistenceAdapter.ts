import { PersistenceAdapter } from 'ask-sdk-core';
import { DynamoDbPersistenceAdapter } from 'ask-sdk-dynamodb-persistence-adapter';
import { RequestEnvelope } from 'ask-sdk-model';
import { FirebasePersistenceAdapter } from './FirebasePersistenceAdapter';
import { AuthCode, UserData } from './UserData';

export const tableNames = {
  authCodes: 'auth-codes',
} as const;

export class FirebaseWithDynamoDbPersistenceAdapter
  implements PersistenceAdapter {
  private _firebasePersistenceAdapter: FirebasePersistenceAdapter;
  private _dynamoDbPersistenceAdapter: DynamoDbPersistenceAdapter;

  public constructor() {
    this._firebasePersistenceAdapter = new FirebasePersistenceAdapter();
    this.initDynamoDB();
  }

  private initDynamoDB() {
    this._dynamoDbPersistenceAdapter = new DynamoDbPersistenceAdapter({
      tableName: tableNames.authCodes,
      createTable: true,
    });
  }

  public getAttributes(requestEnvelope: RequestEnvelope): Promise<UserData> {
    return this._firebasePersistenceAdapter.getAttributes(requestEnvelope);
  }

  private setAuthCode(
    requestEnvelope: RequestEnvelope,
    docId: string,
    code: AuthCode
  ) {
    return this._dynamoDbPersistenceAdapter.saveAttributes(requestEnvelope, {
      id: docId,
      code,
    });
  }

  public async saveAttributes(
    requestEnvelope: RequestEnvelope,
    attributes: UserData
  ): Promise<void> {
    await this._firebasePersistenceAdapter.saveAttributes(requestEnvelope);

    if (attributes.authCode) {
      await this.setAuthCode(
        requestEnvelope,
        await this._firebasePersistenceAdapter.getUserRefId(requestEnvelope),
        attributes.authCode
      );
    }
  }
}
