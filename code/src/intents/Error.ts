import { ErrorHandler } from 'ask-sdk-core';
import { FeedIsTooLongError, InvalidFeedUrlError } from '../logic/Errors';
import { TFunction } from '../util/localization';

export const InvalidFeedUrlErrorHandler: ErrorHandler = {
  canHandle(_, error) {
    return error instanceof InvalidFeedUrlError;
  },
  handle(handlerInput, error: InvalidFeedUrlError) {
    const {
      t,
    }: {
      t?: TFunction;
    } = handlerInput.attributesManager.getRequestAttributes();

    let errorMessageKey = 'ERROR_MSG';
    switch (error.code) {
      case 'invalid-url':
        errorMessageKey = 'INVALID_URL_' + errorMessageKey;
        break;
      case 'no-feed':
        errorMessageKey = 'NO_FEED_' + errorMessageKey;
        break;
    }

    const speakOutput = `${t(errorMessageKey)} ${t(
      'INVALID_FEED_URL_ERROR_MSG'
    )} ${t('REPROMPT_MSG')}`;

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  },
};

export const FeedIsTooLongErrorHandler: ErrorHandler = {
  canHandle(_, error) {
    return error instanceof FeedIsTooLongError;
  },
  handle(handlerInput) {
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
  handle(handlerInput, error) {
    console.log(`~~~~ Error handled: ${error.stack}`);

    const {
      t,
    }: {
      t?: TFunction;
    } = handlerInput.attributesManager.getRequestAttributes();

    const speakOutput = `${t('ERROR_MSG')} ${t('TRY_AGAIN_MSG')}`;

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  },
};
