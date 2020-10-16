import { capture } from "ts-mockito";
import { ListIntentHandler } from "../../src/intents/List";
import { mockHandlerInput } from "../util/HandlerInputMocks";

function testListIntentShowsAllFeeds(locale: string) {
  return async () => {
    const feedNames = ["lorem", "ipsum"];

    const mocks = await mockHandlerInput(locale, { feedNames: feedNames });

    ListIntentHandler.handle(mocks.instanceHandlerInput);

    const [responseSpeakOutput] = capture(
      mocks.mockedResponseBuilder.speak
    ).last();
    const [, responseCardContent] = capture(
      mocks.mockedResponseBuilder.withSimpleCard
    ).last();

    // The output contains all feed names in order
    // (the 's' flag causes the dot to match all characters - including newlines)
    const containsInOrderRegex = new RegExp(
      `.*?${feedNames.join(".*?")}.*`,
      's'
    );

    expect(responseSpeakOutput).toMatch(containsInOrderRegex);
    expect(responseCardContent).toMatch(containsInOrderRegex);
  };
}

test("List intent shows all feeds (en)", testListIntentShowsAllFeeds('en'));
test("List intent shows all feeds (es)", testListIntentShowsAllFeeds('es'));
