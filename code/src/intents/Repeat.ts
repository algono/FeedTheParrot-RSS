import {
  RequestHandler,
  getRequestType,
  getIntentName,
  ResponseInterceptor,
} from 'ask-sdk-core';
import { getSpeakOutput } from '../util/helpers';

export const SaveResponseForRepeatingInterceptor: ResponseInterceptor = {
  process(handlerInput, response) {
    const responseOutputSpeech = response.outputSpeech;

    if (responseOutputSpeech !== undefined) {
      const lastResponse = getSpeakOutput(responseOutputSpeech);

      const {
        getSessionAttributes,
        setSessionAttributes,
      } = handlerInput.attributesManager;

      const sessionAttributes = getSessionAttributes();
      sessionAttributes.lastResponse = lastResponse;
      setSessionAttributes(sessionAttributes);
    }
  },
};

export const RepeatIntentHandler: RequestHandler = {
  canHandle(handlerInput) {
    return (
      getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      getIntentName(handlerInput.requestEnvelope) === 'AMAZON.RepeatIntent'
    );
  },
  handle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    const speakOutput: string = sessionAttributes.lastResponse;

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  },
};
