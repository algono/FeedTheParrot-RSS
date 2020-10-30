import { ErrorHandler } from 'ask-sdk-core';
import { TFunction } from '../util/localization';

export class FeedIsTooLongError extends Error {
  constructor() {
    super();
    Object.setPrototypeOf(this, FeedIsTooLongError.prototype);
  }
}

export const FeedIsTooLongErrorHandler: ErrorHandler = {
  canHandle(_, error) {
    return error instanceof FeedIsTooLongError;
  },
  async handle(handlerInput) {
    const {
      t,
    }: {
      t?: TFunction;
    } = handlerInput.attributesManager.getRequestAttributes();

    const speakOutput = `${t('FEED_TOO_LONG_ERROR_MSG')} ${t('REPROMPT_MSG')}`;

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  },
};

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
export const GenericErrorHandler: ErrorHandler = {
  canHandle() {
    return true;
  },
  async handle(handlerInput, error) {
    console.log(`~~~~ Error handled: ${error.stack}`);

    const {
      t,
    }: {
      t?: TFunction;
    } = handlerInput.attributesManager.getRequestAttributes();

    const speakOutput = t('ERROR_MSG');

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  },
};
