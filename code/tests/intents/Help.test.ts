import { capture } from "ts-mockito";
import { HelpIntentHandler } from "../../src/intents/Help";
import { mockHandlerInput } from "../util/HandlerInputMocks";

function testHelpIntentShowsHelpMsg(locale: string) {
    return async () => {
      const mocks = await mockHandlerInput(locale);
  
      HelpIntentHandler.handle(mocks.instanceHandlerInput);
  
      const [responseSpeakOutput] = capture(
        mocks.mockedResponseBuilder.speak
      ).last();

      expect(responseSpeakOutput).toEqual(mocks.t('HELP_MSG'));
    };
  }
  
  test("Help intent shows help message (en)", testHelpIntentShowsHelpMsg('en'));
  test("Help intent shows help message (es)", testHelpIntentShowsHelpMsg('es'));