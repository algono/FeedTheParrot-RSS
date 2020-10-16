import {
  AttributesManager,
  HandlerInput,
  ResponseBuilder,
  getRequestType,
  getIntentName,
  RequestHandler,
} from 'ask-sdk-core';
import { TFunction } from 'i18next';
import { mocked } from 'ts-jest/utils';
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

/**
 * Tests if the 'canHandle' function of the handler handles the intent successfully
 * @example
 * jest.mock('ask-sdk-core'); // You must ALWAYS mock the module first
 * // ...
 * testIntentCanHandle(HelpIntentHandler, 'AMAZON.HelpIntent');
 *
 * @param handler The request handler for the intent
 * @param intentName The intent's name
 */
export function testIntentCanHandle(
  handler: RequestHandler,
  intentName: string
) {
  const requestType = 'IntentRequest';

  test(`${intentName} intent can be handled when called`, () => {
    mocked(getRequestType).mockReturnValue(requestType);
    mocked(getIntentName).mockReturnValue(intentName);

    const handlerInput = mock<HandlerInput>();
    when(handlerInput.requestEnvelope).thenReturn(null);

    expect(handler.canHandle(instance(handlerInput))).toBe(true);
  });
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
