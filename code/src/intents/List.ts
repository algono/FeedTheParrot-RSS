import { RequestHandler, getRequestType, getIntentName } from "ask-sdk-core";

export const ListIntentHandler : RequestHandler = {
    canHandle(handlerInput) {
        return getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && getIntentName(handlerInput.requestEnvelope) === 'ListIntent';
    },
    handle(handlerInput) {
        const requestAttributes = handlerInput.attributesManager.getRequestAttributes();

        const feedListMessage = requestAttributes.t('FEED_LIST_MSG');
        const feedListReprompt = requestAttributes.t('FEED_LIST_PROMPT_MSG');

        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        const feedNames = sessionAttributes.feedNames;

        console.log('(ListIntent) Feed names: ' + JSON.stringify(feedNames));

        const feedList = feedNames.join(', ');
        
        const speakOutput: string = feedListMessage + feedList + '. ' + feedListReprompt;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .withSimpleCard(feedListMessage, feedList)
            .reprompt(feedListReprompt)
            .getResponse();
    }
};