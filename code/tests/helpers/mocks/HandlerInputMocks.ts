import { AttributesManager, HandlerInput, ResponseBuilder } from 'ask-sdk-core';
import { RequestEnvelope, Response, ui } from 'ask-sdk-model';
import { anyString, anything, instance, mock, when } from 'ts-mockito';
import { init, TFunction } from '../../../src/util/localization';
import { resolvableInstance } from '../ts-mockito/resolvableInstance';

export interface HandlerInputMocks {
  mockedHandlerInput: HandlerInput;
  mockedRequestEnvelope: RequestEnvelope;
  mockedAttributesManager: AttributesManager;
  mockedResponseBuilder: ResponseBuilder;
  mockedResponse?: Response;

  instanceHandlerInput: HandlerInput;
  instanceRequestEnvelope: RequestEnvelope;
  instanceAttributesManager: AttributesManager;
  instanceResponseBuilder: ResponseBuilder;
  instanceResponse?: Response;

  t: TFunction;
}

export interface MockHandlerInputOptions {
  locale?: string;
  sessionAttributes?: {
    [key: string]: any;
  };
  requestAttributes?: {
    [key: string]: any;
  };
  outputSpeech?: ui.OutputSpeech;
  addTFunctionToRequestAttributes?: boolean;
}

export async function mockHandlerInput({
  locale,
  sessionAttributes = {},
  requestAttributes = {},
  outputSpeech,
  addTFunctionToRequestAttributes = true,
}: MockHandlerInputOptions = {}): Promise<HandlerInputMocks> {
  const mockedHandlerInput = mock<HandlerInput>();

  const mockedAttributesManager = mock<AttributesManager>();

  const t = locale
    ? await init(locale)
    : locale === null
    ? () => ''
    : () => {
        throw new Error(
          "You called the 't' function but never initialized the locale"
        );
      };

  if (addTFunctionToRequestAttributes) {
    if (requestAttributes) requestAttributes.t = t;
    else requestAttributes = { t };
  }

  when(mockedAttributesManager.getRequestAttributes()).thenReturn(
    requestAttributes
  );

  when(
    mockedAttributesManager.getSessionAttributes<{
      [key: string]: any;
    }>()
  ).thenReturn(sessionAttributes);

  when(
    mockedAttributesManager.setSessionAttributes(anything())
  ).thenCall(() => {});

  const mockedRequestEnvelope = mock<RequestEnvelope>();
  const instanceRequestEnvelope = instance(mockedRequestEnvelope);

  when(mockedHandlerInput.requestEnvelope).thenReturn(instanceRequestEnvelope);

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
  when(mockedResponseBuilder.addDirective(anything())).thenCall(() =>
    instance(mockedResponseBuilder)
  );
  when(mockedResponseBuilder.addDelegateDirective(anything())).thenCall(() =>
    instance(mockedResponseBuilder)
  );
  when(
    mockedResponseBuilder.addConfirmIntentDirective(anything())
  ).thenCall(() => instance(mockedResponseBuilder));

  const mockedResponse = mock<Response>();

  when(mockedResponse.outputSpeech).thenReturn(outputSpeech);

  const instanceResponse = resolvableInstance(mockedResponse);

  when(mockedResponseBuilder.getResponse()).thenReturn(instanceResponse);

  const instanceResponseBuilder = instance(mockedResponseBuilder);

  when(mockedHandlerInput.responseBuilder).thenReturn(instanceResponseBuilder);

  const instanceHandlerInput = instance(mockedHandlerInput);

  const mocks: HandlerInputMocks = {
    mockedHandlerInput,
    mockedRequestEnvelope,
    mockedAttributesManager,
    mockedResponseBuilder,
    mockedResponse,

    instanceHandlerInput,
    instanceRequestEnvelope,
    instanceAttributesManager,
    instanceResponseBuilder,
    instanceResponse,

    t: t,
  };

  return mocks;
}
