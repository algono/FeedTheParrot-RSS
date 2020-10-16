import { AttributesManager, HandlerInput, ResponseBuilder } from 'ask-sdk-core';
import { TFunction } from 'i18next';
import { anyString, instance, mock, when } from 'ts-mockito';
import { init } from '../../src/util/localization';

export interface HandlerInputMocks {
  mockedHandlerInput: HandlerInput;
  mockedAttributesManager: AttributesManager;
  mockedResponseBuilder: ResponseBuilder;

  instanceHandlerInput: HandlerInput;
  instanceAttributesManager: AttributesManager;
  instanceResponseBuilder: ResponseBuilder;

  t: TFunction;
}

export async function mockHandlerInput(
  locale: string,
  sessionAttributes: { [key: string]: any } = {},
  requestAttributes: { [key: string]: any } = {}
): Promise<HandlerInputMocks> {
  const mockedHandlerInput = mock<HandlerInput>();

  const mockedAttributesManager = mock<AttributesManager>();

  const t = await init(locale);
  requestAttributes.t = t;

  when(mockedAttributesManager.getRequestAttributes()).thenReturn(
    requestAttributes
  );

  when(
    mockedAttributesManager.getSessionAttributes<{
      [key: string]: any;
    }>()
  ).thenReturn(sessionAttributes);

  const instanceAttributesManager = instance(mockedAttributesManager);

  when(mockedHandlerInput.attributesManager).thenReturn(
    instanceAttributesManager
  );

  const mockedResponseBuilder = mock<ResponseBuilder>();

  when(mockedResponseBuilder.speak(anyString())).thenCall(() =>
    instance(mockedResponseBuilder)
  );
  when(mockedResponseBuilder.reprompt(anyString())).thenCall(() =>
    instance(mockedResponseBuilder)
  );
  when(
    mockedResponseBuilder.withSimpleCard(anyString(), anyString())
  ).thenCall(() => instance(mockedResponseBuilder));
  when(mockedResponseBuilder.getResponse()).thenCall(() =>
    instance(mockedResponseBuilder)
  );

  const instanceResponseBuilder = instance(mockedResponseBuilder);

  when(mockedHandlerInput.responseBuilder).thenReturn(instanceResponseBuilder);

  const instanceHandlerInput = instance(mockedHandlerInput);

  const mocks: HandlerInputMocks = {
    mockedHandlerInput: mockedHandlerInput,
    mockedAttributesManager: mockedAttributesManager,
    mockedResponseBuilder: mockedResponseBuilder,

    instanceHandlerInput: instanceHandlerInput,
    instanceAttributesManager: instanceAttributesManager,
    instanceResponseBuilder: instanceResponseBuilder,

    t: t,
  };

  return mocks;
}
