import { RequestHandler, getRequestType, getIntentName } from 'ask-sdk-core';
import { Database } from '../database/Database';
import { TFunction } from '../util/localization';

export const ListIntentHandler: RequestHandler = {
  canHandle(handlerInput) {
    return (
      getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      getIntentName(handlerInput.requestEnvelope) === 'ListIntent'
    );
  },
  async handle(handlerInput) {
    const { attributesManager, responseBuilder } = handlerInput;
    const {
      t,
    }: {
      t?: TFunction;
    } = attributesManager.getRequestAttributes();

    const feedListMessage = t('FEED_LIST_MSG');
    const feedListEmptyMessage = t('FEED_LIST_EMPTY_MSG');
    const feedListReprompt = t('REPROMPT_MSG');

    const userData = await Database.use(attributesManager).getUserData();
    const feedNames: string[] = userData.feedNames;

    console.log('(ListIntent) Feed names: ' + JSON.stringify(feedNames));

    const speakOutput: string =
      (feedNames && feedNames.length > 0
        ? feedListMessage + feedNames.join(', ') + '. '
        : `${feedListEmptyMessage} `) + feedListReprompt;

    return responseBuilder
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
