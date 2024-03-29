import { RequestHandler, getRequestType, getIntentName } from 'ask-sdk-core';
import { TFunction } from '../util/localization';

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request

// handler chain below.
export const IntentReflectorHandler: RequestHandler = {
  canHandle(handlerInput) {
    return getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
  },
  handle(handlerInput) {
    const intentName = getIntentName(handlerInput.requestEnvelope);

    const {
      t,
    }: {
      t?: TFunction;
    } = handlerInput.attributesManager.getRequestAttributes();

    const speakOutput = t('REFLECTOR_MSG', {
      intent: intentName,
    });

    return (
      handlerInput.responseBuilder
        .speak(speakOutput)
        //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
        .getResponse()
    );
  },
};
