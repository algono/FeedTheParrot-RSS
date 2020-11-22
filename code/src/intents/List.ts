import { RequestHandler, getRequestType, getIntentName } from 'ask-sdk-core';
import { TFunction } from '../util/localization';

export const ListIntentHandler: RequestHandler = {
  canHandle(handlerInput) {
    return (
      getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      getIntentName(handlerInput.requestEnvelope) === 'ListIntent'
    );
  },
  handle(handlerInput) {
    const {
      t,
    }: {
      t?: TFunction;
    } = handlerInput.attributesManager.getRequestAttributes();

    const feedListMessage = t('FEED_LIST_MSG');
    const feedListEmptyMessage = t('FEED_LIST_EMPTY_MSG');
    const feedListReprompt = t('REPROMPT_MSG');

    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const feedNames: string[] = sessionAttributes.feedNames;

    console.log('(ListIntent) Feed names: ' + JSON.stringify(feedNames));

    const speakOutput: string =
      (feedNames && feedNames.length > 0
        ? feedListMessage + feedNames.join(', ') + '. '
        : `${feedListEmptyMessage} `) + feedListReprompt;

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .withSimpleCard(
        feedListMessage,
        feedNames && feedNames.length > 0
          ? '- ' + feedNames.join('\n- ')
          : feedListEmptyMessage
      )
      .reprompt(feedListReprompt)
      .getResponse();
  },
};
