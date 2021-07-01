import AWS from 'aws-sdk';
import { PromiseResult } from 'aws-sdk/lib/request';
import { mocked } from 'ts-jest/utils';
import { anything, instance, mock, when } from 'ts-mockito';
import { resolvableInstance } from '../ts-mockito/resolvableInstance';

function mockRequest<D>(result: PromiseResult<D, AWS.AWSError>) {
  const requestMock = mock<AWS.Request<D, AWS.AWSError>>();

  when(requestMock.promise()).thenResolve(result);

  return requestMock;
}

function mockSTS() {
  const stsMock = mock<AWS.STS>();
  const configMock = mock<AWS.Config>();
  const configCredentialsMock = mock<AWS.Credentials>();

  when(configMock.credentials).thenCall(() => instance(configCredentialsMock));
  when(stsMock.config).thenCall(() => instance(configMock));

  const credentialsMock =
    mock<PromiseResult<AWS.STS.AssumeRoleResponse, AWS.AWSError>>();

  const stsCredentialsMock = mock<AWS.STS.Credentials>();
  when(credentialsMock.Credentials).thenCall(() =>
    instance(stsCredentialsMock)
  );

  const requestMock = mockRequest<AWS.STS.AssumeRoleResponse>(
    resolvableInstance(credentialsMock)
  );
  when(stsMock.assumeRole(anything(), anything())).thenCall((_cfg, callback) =>
    callback(null, instance(requestMock))
  );

  return stsMock;
}

export function mockDocumentClient() {
  const clientMock = mock<AWS.DynamoDB.DocumentClient>();

  const requestMock =
    mockRequest<AWS.DynamoDB.DocumentClient.PutItemOutput>(null);

  when(clientMock.put(anything())).thenCall(() => instance(requestMock));

  mocked(AWS.DynamoDB.DocumentClient).mockImplementation(() =>
    instance(clientMock)
  );

  const stsMock = mockSTS();
  mocked(AWS.STS).mockImplementation(() => instance(stsMock));

  return { clientMock, stsMock };
}
