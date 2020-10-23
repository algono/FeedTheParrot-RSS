import { ErrorHandler } from 'ask-sdk-core';
import { localizationRequestInterceptor } from '../util/localization';

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
export const GenericErrorHandler: ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`~~~~ Error handled: ${error.stack}`);

    // It turns out that the error handler doesn't call the localization interceptor
    // And the ReadIntent may change the localization language
    // So we have to call it again manually to ensure that the language is correctly set
    localizationRequestInterceptor.process(handlerInput);

    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();

    const speakOutput: string = requestAttributes.t('ERROR_MSG');

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  },
};
