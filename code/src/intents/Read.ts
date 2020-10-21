import {
  RequestHandler,
  getRequestType,
  getIntentName,
  getSlotValue,
  getLocale,
  HandlerInput,
  getRequest,
} from 'ask-sdk-core';
import { IntentRequest } from 'ask-sdk-model';

import {
  feedSlotName,
  EXTRA_LONG_PAUSE,
  PAUSE_BETWEEN_ITEMS,
  LONG_PAUSE,
} from '../util/constants';
import { Feed, FeedItem, getItems } from '../logic/Feed';

import * as localization from '../util/localization';

export interface ReadState {
  reading: boolean;
  feedName: string;
  feed: Feed;
  feedItems: FeedItem[];
  currentIndex: number;
  currentContentIndex?: number;
  speakQueue?: string;
}

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
    const requestAttributes = attributesManager.getRequestAttributes();

    const { t } = requestAttributes;

    const feedName = getSlotValue(requestEnvelope, feedSlotName);
    console.log('(ReadIntent) Feed name received: ' + feedName);

    // If the feed name has not been received yet, let Alexa continue the dialogue
    if (!feedName) {
      return responseBuilder
        .addDelegateDirective((requestEnvelope.request as IntentRequest).intent)
        .getResponse();
    }

    const sessionAttributes = attributesManager.getSessionAttributes();

    const feedNames = sessionAttributes.feedNames;

    console.log('(ReadIntent) Feed names: ' + JSON.stringify(feedNames));

    // If the feed is not on our list, return and warn the user
    if (!(feedNames && feedNames.includes(feedName))) {
      const nextIntent = (requestEnvelope.request as IntentRequest).intent;
      nextIntent.slots[feedSlotName].confirmationStatus = 'DENIED'; // Invalidate the feed name given

      const noFeedMsg = t('NO_FEED_MSG');
      return responseBuilder
        .speak(noFeedMsg) // Warn the user
        .addDelegateDirective(nextIntent) // Try again (feed name invalidated)
        .getResponse();
    }

    const locale = getLocale(requestEnvelope);

    const feed: Feed = sessionAttributes.feeds[feedName];

    const items = await getItems(feed, locale);

    // The translation function has to be updated (it seems like it is singleton)
    await localization.init(locale);

    const readState: ReadState = {
      reading: true,
      feedName: feedName,
      feed: feed,
      feedItems: items,
      currentIndex: 0,
    };

    sessionAttributes.readState = readState;

    attributesManager.setSessionAttributes(sessionAttributes);

    console.log(
      'Session attributes in ReadIntent: ' + JSON.stringify(sessionAttributes)
    );

    return ReadItemIntentHandler.handle(handlerInput);
  },
};

export const ReadItemIntentHandler: RequestHandler = {
  canHandle(handlerInput) {
    const { attributesManager, requestEnvelope } = handlerInput;

    const sessionAttributes = attributesManager.getSessionAttributes();

    return (
      sessionAttributes.readState &&
      (sessionAttributes.readState as ReadState).reading &&
      getRequestType(requestEnvelope) === 'IntentRequest' &&
      (getIntentName(requestEnvelope) === 'AMAZON.RepeatIntent' ||
        getIntentName(requestEnvelope) === 'ReadItemIntent')
    );
  },
  handle(handlerInput) {
    const { attributesManager, responseBuilder } = handlerInput;

    const requestAttributes = attributesManager.getRequestAttributes();
    const { t } = requestAttributes;

    const sessionAttributes = attributesManager.getSessionAttributes();

    console.log(
      '(ReadItemIntent) Session attributes: ' +
        JSON.stringify(sessionAttributes)
    );

    const readState: ReadState = sessionAttributes.readState;

    if (readState.currentContentIndex) {
      delete readState.currentContentIndex;
      attributesManager.setSessionAttributes(sessionAttributes);
    }

    const index = readState.currentIndex;

    const items = readState.feedItems;

    // If there was something in the speak queue, output it now
    let speakOutput: string = readState.speakQueue || '';

    // If the index is within the items length, continue
    if (index >= 0 && index < items.length) {
      const item = items[index];

      console.log('Read Feed Item: ' + JSON.stringify(item));

      // Read only the title
      speakOutput +=
        item.alexaReads.title +
        EXTRA_LONG_PAUSE +
        t('CONFIRMATION_CONTINUE_READING_FEED');

      return responseBuilder
        .speak(speakOutput)
        .reprompt(speakOutput) // Ask for confirmation to continue reading
        .getResponse();
    } else {
      speakOutput += t('END_READING_FEED');

      responseBuilder.speak(speakOutput);

      sessionAttributes.readState.reading = false;
      attributesManager.setSessionAttributes(sessionAttributes);
    }

    return responseBuilder.getResponse();
  },
};

export const ReadContentIntentHandler: RequestHandler = {
  canHandle(handlerInput) {
    const { attributesManager, requestEnvelope } = handlerInput;

    const sessionAttributes = attributesManager.getSessionAttributes();

    return (
      sessionAttributes.readState &&
      (sessionAttributes.readState as ReadState).reading &&
      getRequestType(requestEnvelope) === 'IntentRequest' &&
      getIntentName(requestEnvelope) === 'AMAZON.YesIntent'
    );
  },
  handle(handlerInput) {
    const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;

    const intentRequest = getRequest<IntentRequest>(requestEnvelope);

    const sessionAttributes = attributesManager.getSessionAttributes();

    const readState: ReadState = sessionAttributes.readState;

    if (intentRequest.intent.confirmationStatus == 'DENIED') {
      return responseBuilder
        .addDelegateDirective({
          name: 'AMAZON.NextIntent',
          confirmationStatus: 'CONFIRMED',
        })
        .getResponse();
    }

    const item = readState.feedItems[readState.currentIndex];

    const { t } = attributesManager.getRequestAttributes();

    const index = readState.currentContentIndex ?? 0;

    const content = item.alexaReads.content;

    // The card has to be shown in all cases
    responseBuilder.withStandardCard(item.title, item.cardReads, item.imageUrl);

    let speakOutputItem: string, confirmationMsg: string, nextIntentName: string;

    // If it is any content item but the last one, prompt for continue reading the next
    if (index >= 0 && index < content.length - 1) {
      confirmationMsg = t('CONFIRMATION_CONTINUE_READING_FEED');
      nextIntentName = 'AMAZON.YesIntent';

      readState.currentContentIndex = index + 1;
      speakOutputItem = content[index];
    } else {
      confirmationMsg = t('CONFIRMATION_GOTO_NEXT_FEED_ITEM');
      nextIntentName = 'AMAZON.NextIntent';

      delete readState.currentContentIndex;
      speakOutputItem = (index == content.length - 1) ? content[index] : '';
    }

    if (speakOutputItem) speakOutputItem += LONG_PAUSE;

    attributesManager.setSessionAttributes(sessionAttributes);

    return responseBuilder
      .speak(speakOutputItem + confirmationMsg)
      .addConfirmIntentDirective({
        name: nextIntentName,
        confirmationStatus: 'NONE',
      })
      .getResponse();
  },
};

function moveItemIndex(handlerInput: HandlerInput, n: number) {
  const { attributesManager } = handlerInput;

  const sessionAttributes = attributesManager.getSessionAttributes();

  const readState: ReadState = sessionAttributes.readState;

  // Move the index n items
  readState.currentIndex += n;

  // Add pause to the speak queue
  readState.speakQueue = PAUSE_BETWEEN_ITEMS;

  attributesManager.setSessionAttributes(sessionAttributes);

  return ReadItemIntentHandler.handle(handlerInput);
}

export const GoToPreviousItemIntentHandler: RequestHandler = {
  canHandle(handlerInput) {
    const { attributesManager, requestEnvelope } = handlerInput;

    const sessionAttributes = attributesManager.getSessionAttributes();

    return (
      sessionAttributes.readState &&
      (sessionAttributes.readState as ReadState).reading &&
      getRequestType(requestEnvelope) === 'IntentRequest' &&
      getIntentName(requestEnvelope) === 'AMAZON.PreviousIntent'
    );
  },
  handle: (handlerInput) => moveItemIndex(handlerInput, -1),
};

export const SkipItemIntentHandler: RequestHandler = {
  canHandle(handlerInput) {
    const { attributesManager, requestEnvelope } = handlerInput;

    const sessionAttributes = attributesManager.getSessionAttributes();

    return (
      sessionAttributes.readState &&
      (sessionAttributes.readState as ReadState).reading &&
      getRequestType(requestEnvelope) === 'IntentRequest' &&
      (getIntentName(requestEnvelope) === 'AMAZON.NoIntent' ||
        getIntentName(requestEnvelope) === 'AMAZON.NextIntent')
    );
  },
  handle: (handlerInput) => {
    const { requestEnvelope, responseBuilder } = handlerInput;

    const intentRequest = getRequest<IntentRequest>(requestEnvelope);

    if (intentRequest.intent.confirmationStatus == 'DENIED') {
      return responseBuilder
        .addDelegateDirective({
          name: 'AMAZON.CancelIntent',
          confirmationStatus: 'NONE',
        })
        .getResponse();
    }

    return moveItemIndex(handlerInput, 1);
  },
};
