import { getUserId, PersistenceAdapter } from 'ask-sdk-core';
import { RequestEnvelope } from 'ask-sdk-model';
import AWS from 'aws-sdk';
import { FirebasePersistenceAdapter } from './FirebasePersistenceAdapter';
import { AuthCode, authCodeToDB, UserData } from './UserData';

const dynamoDbParameters = {
  tableName: 'feed-the-parrot-auth',
  region: 'eu-west-1',
};

export class FirebaseWithDynamoDbPersistenceAdapter
  implements PersistenceAdapter
{
  private _firebasePersistenceAdapter: FirebasePersistenceAdapter;
  private _dynamoDbDocumentClient: AWS.DynamoDB.DocumentClient;

  public constructor() {
    this._firebasePersistenceAdapter = new FirebasePersistenceAdapter();
  }

  public async initDynamoDb() {
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

    this._dynamoDbDocumentClient = new AWS.DynamoDB.DocumentClient({
      apiVersion: '2012-08-10',
      region: dynamoDbParameters.region,
      accessKeyId: credentials.Credentials.AccessKeyId,
      secretAccessKey: credentials.Credentials.SecretAccessKey,
      sessionToken: credentials.Credentials.SessionToken,
    });
  }

  public getAttributes(requestEnvelope: RequestEnvelope): Promise<UserData> {
    return this._firebasePersistenceAdapter.getAttributes(requestEnvelope);
  }

  private setAuthCode(requestEnvelope: RequestEnvelope, code: AuthCode) {
    return this._dynamoDbDocumentClient
      .put({
        TableName: dynamoDbParameters.tableName,
        Item: {
          id: getUserId(requestEnvelope),
          ...authCodeToDB(code),
        },
      })
      .promise();
  }

  public async saveAttributes(
    requestEnvelope: RequestEnvelope,
    attributes: UserData
  ): Promise<void> {
    await this._firebasePersistenceAdapter.saveAttributes(requestEnvelope);

    if (attributes.authCode) {
      if (!this._dynamoDbDocumentClient) {
        await this.initDynamoDb();
      }

      await this.setAuthCode(requestEnvelope, attributes.authCode);
    }
  }
}
