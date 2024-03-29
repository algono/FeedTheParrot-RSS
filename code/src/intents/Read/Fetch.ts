import {
  RequestHandler,
  getRequestType,
  getIntentName,
  getSlotValue,
  getRequest,
  getLocale,
} from 'ask-sdk-core';
import { IntentRequest } from 'ask-sdk-model';
import { TFunction } from 'i18next';
import { getItems } from '../../util/feed/getItems';
import { feedSlotName } from '../../util/constants';
import { ReadState, ReadItemIntentHandler } from './Item';
import { Database } from '../../database/Database';

export const ReadIntentHandler: RequestHandler = {
  canHandle(handlerInput) {
    return (
      getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      getIntentName(handlerInput.requestEnvelope) === 'ReadIntent'
    );
  },
  async handle(handlerInput) {
    const {
      attributesManager,
      requestEnvelope,
      responseBuilder,
    } = handlerInput;

    const { t }: { t?: TFunction } = attributesManager.getRequestAttributes();

    const feedName = getSlotValue(requestEnvelope, feedSlotName);
    console.log('(ReadIntent) Feed name received: ' + feedName);

    const userData = await Database.use(attributesManager).getUserData();
    const feedNames = userData.feedNames;

    console.log('(ReadIntent) Feed names: ' + JSON.stringify(feedNames));

    // If there are no feeds available, warn the user
    if (!feedNames || feedNames.length === 0) {
      const speakOutput = `${t('FEED_LIST_EMPTY_MSG')} ${t('REPROMPT_MSG')}`;
      return responseBuilder
        .speak(speakOutput)
        .reprompt(speakOutput)
        .getResponse();
    }

    // If the feed name has not been received yet, let Alexa continue the dialogue
    if (!feedName) {
      return responseBuilder
        .addDelegateDirective(getRequest<IntentRequest>(requestEnvelope).intent)
        .getResponse();
    }

    // If the feed is not on our list, return and warn the user
    if (!feedNames.includes(feedName)) {
      const nextIntent = getRequest<IntentRequest>(requestEnvelope).intent;
      nextIntent.slots[feedSlotName].confirmationStatus = 'DENIED'; // Invalidate the feed name given

      const noFeedMsg = t('NO_FEED_MSG');
      return responseBuilder
        .speak(noFeedMsg) // Warn the user
        .addDelegateDirective(nextIntent) // Try again (feed name invalidated)
        .getResponse();
    }

    const locale = getLocale(requestEnvelope);

    const feed = userData.feeds[feedName];

    const items = await getItems(feed, locale);

    const readState: ReadState = {
      reading: false,
      feedName: feedName,
      feed: feed,
      feedItems: items,
      currentIndex: 0,
    };

    const sessionAttributes = attributesManager.getSessionAttributes();

    sessionAttributes.readState = readState;

    console.log(
      'Session attributes in ReadIntent: ' + JSON.stringify(sessionAttributes)
    );

    return ReadItemIntentHandler.handle(handlerInput);
  },
};
