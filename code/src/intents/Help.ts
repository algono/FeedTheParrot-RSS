import { RequestHandler, getRequestType, getIntentName } from 'ask-sdk-core';
import { TFunction } from '../util/localization';

export const HelpIntentHandler: RequestHandler = {
  canHandle(handlerInput) {
    return (
      getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent'
    );
  },
  handle(handlerInput) {
    const {
      t,
    }: {
      t?: TFunction;
    } = handlerInput.attributesManager.getRequestAttributes();
    const speakOutput = t('HELP_MSG');

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  },
};
