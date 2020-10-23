import { AttributesManager, HandlerInput, ResponseBuilder } from 'ask-sdk-core';
import { Response, ui } from 'ask-sdk-model';
import { TFunction } from 'i18next';
import { anyString, anything, instance, mock, when } from 'ts-mockito';
import { init } from '../../src/util/localization';

export interface HandlerInputMocks {
  mockedHandlerInput: HandlerInput;
  mockedAttributesManager: AttributesManager;
  mockedResponseBuilder: ResponseBuilder;
  mockedResponse?: Response;

  instanceHandlerInput: HandlerInput;
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
  mockResponse?: boolean;
}

/**
 * 
 * @param mockResponse (boolean) (optional) Whether or not we want to mock the response from 'getResponse()'.
 * WARNING: If using async method, this should ONLY be true when NOT returning a response
 * (if you absolutely must, then never use 'await' on it. Use 'then(...)' instead.)
 */
export async function mockHandlerInput({
  locale,
  sessionAttributes,
  requestAttributes,
  outputSpeech,
  addTFunctionToRequestAttributes = true,
  mockResponse,
}: MockHandlerInputOptions = {}): Promise<HandlerInputMocks> {
  const mockedHandlerInput = mock<HandlerInput>();

  const mockedAttributesManager = mock<AttributesManager>();

  const t = locale ? await init(locale) : () => '';

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

  when(mockedHandlerInput.requestEnvelope).thenReturn(null);

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

  let mockedResponse: Response, instanceResponse: Response;
  if (mockResponse) {
    mockedResponse = mock<Response>();

    when(mockedResponse.outputSpeech).thenReturn(outputSpeech);

    instanceResponse = instance(mockedResponse);

    // WATCH OUT WITH THIS ONE:
    // Awaiting a mock instance (which is a proxy) leads to an infinite loop
    // For this reason this is optional, and we should only use it (if using async method) when not returning a response
    // (if you absolutely must, then never use 'await' on it. Use 'then(...)' instead.)
    // More details here: https://stackoverflow.com/questions/48338721/await-for-proxy-leads-to-get-of-then-property-what-should-i-return
    when(mockedResponseBuilder.getResponse()).thenReturn(instanceResponse);
  }

  const instanceResponseBuilder = instance(mockedResponseBuilder);

  when(mockedHandlerInput.responseBuilder).thenReturn(instanceResponseBuilder);

  const instanceHandlerInput = instance(mockedHandlerInput);

  const mocks: HandlerInputMocks = {
    mockedHandlerInput,
    mockedAttributesManager,
    mockedResponseBuilder,
    mockedResponse,

    instanceHandlerInput,
    instanceAttributesManager,
    instanceResponseBuilder,
    instanceResponse,

    t: t,
  };

  return mocks;
}
