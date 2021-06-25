import AWS from 'aws-sdk';
import { mocked } from 'ts-jest/utils';
import { anything, instance, mock, when } from 'ts-mockito';

export function mockDocumentClient() {
  const clientMock = mock<AWS.DynamoDB.DocumentClient>();

  const requestMock =
    mock<
      AWS.Request<AWS.DynamoDB.DocumentClient.PutItemOutput, AWS.AWSError>
    >();

  when(requestMock.promise()).thenResolve(null);

  when(clientMock.put(anything())).thenCall(() => instance(requestMock));

  mocked(AWS.DynamoDB.DocumentClient).mockImplementation(() =>
    instance(clientMock)
  );

  return clientMock;
}
