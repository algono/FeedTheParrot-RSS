import { RequestHandler, getRequestType, getIntentName } from 'ask-sdk-core';

export const CancelAndStopIntentHandler: RequestHandler = {
  canHandle(handlerInput) {
    return (
      getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      (getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent' ||
        getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent')
    );
  },
  handle(handlerInput) {
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    const speakOutput: string = requestAttributes.t('GOODBYE_MSG');
    return handlerInput.responseBuilder.speak(speakOutput).getResponse();
  },
};
