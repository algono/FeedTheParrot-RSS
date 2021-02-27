import { PersistenceAdapter } from 'ask-sdk-core';
import { DynamoDbPersistenceAdapter } from 'ask-sdk-dynamodb-persistence-adapter';
import { RequestEnvelope } from 'ask-sdk-model';
import AWS from 'aws-sdk';
import { FirebasePersistenceAdapter } from './FirebasePersistenceAdapter';
import { AuthCode, authCodeToDB, UserData } from './UserData';

interface DynamoDbParameters {
  readonly DYNAMODB_PERSISTENCE_TABLE_NAME: string;
  readonly DYNAMODB_PERSISTENCE_REGION: string;
}

const dynamoDbParameters: DynamoDbParameters = {
  DYNAMODB_PERSISTENCE_TABLE_NAME: 'feed-the-parrot-auth',
  DYNAMODB_PERSISTENCE_REGION: 'eu-west-1',
};

export class FirebaseWithDynamoDbPersistenceAdapter
  implements PersistenceAdapter {
  private _firebasePersistenceAdapter: FirebasePersistenceAdapter;
  private _dynamoDbPersistenceAdapter: DynamoDbPersistenceAdapter;

  public constructor() {
    this._firebasePersistenceAdapter = new FirebasePersistenceAdapter();
    this.initDynamoDb();
  }

  private async initDynamoDb() {
    const STS = new AWS.STS({ apiVersion: '2011-06-15' });
    const credentials = await STS.assumeRole(
      {
        RoleArn: 'arn:aws:iam::303145520006:role/Alexa-Al-Loro-DynamoDB',
        RoleSessionName: 'AlLoroRoleSession',
      },
      (err, res) => {
        if (err) {
          console.log('AssumeRole FAILED: ', err);
          throw new Error('Error while assuming role');
        }
        return res;
      }
    ).promise();

    this._dynamoDbPersistenceAdapter = new DynamoDbPersistenceAdapter({
      tableName: dynamoDbParameters.DYNAMODB_PERSISTENCE_TABLE_NAME,
      createTable: false,
      dynamoDBClient: new AWS.DynamoDB({
        apiVersion: '2012-08-10',
        region: dynamoDbParameters.DYNAMODB_PERSISTENCE_REGION,
        accessKeyId: credentials.Credentials.AccessKeyId,
        secretAccessKey: credentials.Credentials.SecretAccessKey,
        sessionToken: credentials.Credentials.SessionToken,
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
