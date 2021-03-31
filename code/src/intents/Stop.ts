import { RequestHandler, getRequestType, getIntentName } from 'ask-sdk-core';
import { TFunction } from '../util/localization';

export const CancelAndStopIntentHandler: RequestHandler = {
  canHandle(handlerInput) {
    return (
      getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      (getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent' ||
        getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent' ||
        getIntentName(handlerInput.requestEnvelope) === 'AMAZON.PauseIntent')
    );
  },
  handle(handlerInput) {
    const {
      t,
    }: {
      t?: TFunction;
    } = handlerInput.attributesManager.getRequestAttributes();
    const speakOutput = t('GOODBYE_MSG');
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .addAudioPlayerStopDirective()
      .withShouldEndSession(true)
      .getResponse();
  },
};
