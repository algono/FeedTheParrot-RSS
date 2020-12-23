import { PersistenceAdapter } from 'ask-sdk-core';
import { DynamoDbPersistenceAdapter } from 'ask-sdk-dynamodb-persistence-adapter';
import { RequestEnvelope } from 'ask-sdk-model';
import AWS from 'aws-sdk';
import { FirebasePersistenceAdapter } from './FirebasePersistenceAdapter';
import { AuthCode, authCodeToDB, UserData } from './UserData';

interface DynamoDbProcessEnv extends NodeJS.ProcessEnv {
  DYNAMODB_PERSISTENCE_TABLE_NAME: string;
  DYNAMODB_PERSISTENCE_REGION: string;
}

export class FirebaseWithDynamoDbPersistenceAdapter
  implements PersistenceAdapter {
  private _firebasePersistenceAdapter: FirebasePersistenceAdapter;
  private _dynamoDbPersistenceAdapter: DynamoDbPersistenceAdapter;

  public constructor() {
    this._firebasePersistenceAdapter = new FirebasePersistenceAdapter();
    this.initDynamoDb();
  }

  private initDynamoDb() {
    const dynamoDbProcessEnv: DynamoDbProcessEnv = process.env as DynamoDbProcessEnv;

    this._dynamoDbPersistenceAdapter = new DynamoDbPersistenceAdapter({
      tableName: dynamoDbProcessEnv.DYNAMODB_PERSISTENCE_TABLE_NAME,
      createTable: false,
      dynamoDBClient: new AWS.DynamoDB({
        apiVersion: 'latest',
        region: dynamoDbProcessEnv.DYNAMODB_PERSISTENCE_REGION,
      }),
    });
  }

  public getAttributes(requestEnvelope: RequestEnvelope): Promise<UserData> {
    return this._firebasePersistenceAdapter.getAttributes(requestEnvelope);
  }

  private setAuthCode(requestEnvelope: RequestEnvelope, code: AuthCode) {
    return this._dynamoDbPersistenceAdapter.saveAttributes(
      requestEnvelope,
      authCodeToDB(code)
    );
  }

  public async saveAttributes(
    requestEnvelope: RequestEnvelope,
    attributes: UserData
  ): Promise<void> {
    await this._firebasePersistenceAdapter.saveAttributes(requestEnvelope);

    if (attributes.authCode) {
      await this.setAuthCode(requestEnvelope, attributes.authCode);
    }
  }
}
