import { AttributesManager, HandlerInput, ResponseBuilder } from "ask-sdk-core";
import { anyString, capture, instance, mock, when } from "ts-mockito";
import { ListIntentHandler } from "../../src/intents/List";
import { init } from "../../src/util/localization";

function testFeedsListContainsAllFeeds(locale: string) {
  return async () => {
    const feedNames = ["lorem", "ipsum"];

    const mockedHandlerInput = mock<HandlerInput>();


    const mockedAttributesManager = mock<AttributesManager>();

    when(mockedAttributesManager.getRequestAttributes()).thenReturn({
      t: await init(locale),
    });

    when(
      mockedAttributesManager.getSessionAttributes<{
        [key: string]: any;
      }>()
    ).thenReturn({ feedNames: feedNames });

    const myAttributesManager = instance(mockedAttributesManager);

    when(mockedHandlerInput.attributesManager).thenReturn(myAttributesManager);


    const mockedResponseBuilder = mock<ResponseBuilder>();

    when(mockedResponseBuilder.speak(anyString())).thenCall(() => instance(mockedResponseBuilder));
    when(mockedResponseBuilder.reprompt(anyString())).thenCall(() => instance(mockedResponseBuilder));
    when(mockedResponseBuilder.withSimpleCard(anyString(), anyString())).thenCall(() => instance(mockedResponseBuilder));
    when(mockedResponseBuilder.getResponse()).thenCall(() => instance(mockedResponseBuilder));

    const myResponseBuilder = instance(mockedResponseBuilder);

    when(mockedHandlerInput.responseBuilder).thenReturn(myResponseBuilder);

    
    const myHandlerInput = instance(mockedHandlerInput);

    ListIntentHandler.handle(myHandlerInput);

    const [responseSpeakOutput] = capture(mockedResponseBuilder.speak).last();
    const [, responseCardContent] = capture(mockedResponseBuilder.withSimpleCard).last();

    // The output contains all feed names in order
    // (the 's' flag causes the dot to match all characters - including newlines)
    const containsInOrderRegex = new RegExp(`.*?${feedNames.join(".*?")}.*`, 's');
    
    expect(responseSpeakOutput).toMatch(containsInOrderRegex);
    expect(responseCardContent).toMatch(containsInOrderRegex);
  };
}

test("Feeds list contains all feeds (en)", testFeedsListContainsAllFeeds("en"));
test("Feeds list contains all feeds (es)", testFeedsListContainsAllFeeds("es"));
