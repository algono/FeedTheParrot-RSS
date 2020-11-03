import { getRequest } from 'ask-sdk-core';
import { Intent, IntentRequest } from 'ask-sdk-model';
import { mocked } from 'ts-jest/utils';
import { instance, mock, when } from 'ts-mockito';

export function mockIntent() {
  const intentRequestMock = mock<IntentRequest>();

  const intentMock = mock<Intent>();

  when(intentRequestMock.intent).thenCall(() => instance(intentMock));

  mocked(getRequest).mockImplementation(() => instance(intentRequestMock));

  return { intentRequestMock, intentMock };
}
