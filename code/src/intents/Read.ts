import {
  RequestHandler,
  getRequestType,
  getIntentName,
  HandlerInput,
  getRequest,
} from 'ask-sdk-core';
import { IntentRequest } from 'ask-sdk-model';

import {
  EXTRA_LONG_PAUSE,
  PAUSE_BETWEEN_ITEMS,
  LONG_PAUSE,
} from '../util/constants';
import { applyLangFormatter, Feed, FeedItems } from '../logic/Feed';

import { TFunction } from '../util/localization';

export interface ReadState {
  reading: boolean;
  feedName: string;
  feed: Feed;
  feedItems: FeedItems;
  currentIndex: number;
  currentContentIndex?: number;
}

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
    const { t }: { t?: TFunction } = requestAttributes;

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

    let speakOutput: string;

    // If it was reading before, add a pause before reading the item
    // If not, don't and mark that you started reading
    if (readState.reading) {
      speakOutput = PAUSE_BETWEEN_ITEMS;
    } else {
      speakOutput = '';
      readState.reading = true;
    }

    // If the index is within the items length, continue
    if (index >= 0 && index < items.list.length) {
      const item = items.list[index];

      console.log('Read Feed Item: ' + JSON.stringify(item));

      // Read only the title
      speakOutput +=
        applyLangFormatter(item.title, items.langFormatter) +
        EXTRA_LONG_PAUSE +
        t('CONFIRMATION_CONTINUE_READING_FEED');

      return responseBuilder
        .speak(speakOutput)
        .reprompt(speakOutput) // Ask for confirmation to continue reading
        .getResponse();
    } else {
      speakOutput += t('END_READING_FEED');

      responseBuilder.speak(speakOutput);

      readState.reading = false;
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
    const {
      attributesManager,
      requestEnvelope,
      responseBuilder,
    } = handlerInput;

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

    const item = readState.feedItems.list[readState.currentIndex];

    const { t }: { t?: TFunction } = attributesManager.getRequestAttributes();

    const index = readState.currentContentIndex ?? 0;

    const content = item.content;

    let speakOutputItem: string,
      cardOutputItem: string,
      confirmationMsg: string,
      nextIntentName: string;

    if (index >= 0 && index < content.length) {
      cardOutputItem = content[index];
      speakOutputItem = applyLangFormatter(cardOutputItem, readState.feedItems.langFormatter);

      // If it is any content item but the last one, prompt for continue reading the next
      if (index < content.length - 1) {
        confirmationMsg = t('CONFIRMATION_CONTINUE_READING_FEED');
        nextIntentName = 'AMAZON.YesIntent';

        readState.currentContentIndex = index + 1;
      }
    } else {
      speakOutputItem = '';
      cardOutputItem = '';
    }

    // If there are no other items to continue to, go to the next item
    if (!confirmationMsg)
      confirmationMsg = t('CONFIRMATION_GOTO_NEXT_FEED_ITEM');
    if (!nextIntentName) nextIntentName = 'AMAZON.NextIntent';

    if (speakOutputItem) speakOutputItem += LONG_PAUSE;

    attributesManager.setSessionAttributes(sessionAttributes);

    if (cardOutputItem) {
      responseBuilder.withStandardCard(
        item.title,
        cardOutputItem,
        item.imageUrl
      );
    }

    return responseBuilder
      .speak(speakOutputItem + confirmationMsg)
      .addConfirmIntentDirective({
        name: nextIntentName,
        confirmationStatus: 'NONE',
      })
      .getResponse();
  },
};

function moveItemIndexBy(handlerInput: HandlerInput, n: number) {
  const { attributesManager } = handlerInput;

  const sessionAttributes = attributesManager.getSessionAttributes();

  const readState: ReadState = sessionAttributes.readState;

  // Move the index n items
  readState.currentIndex += n;

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
  handle: (handlerInput) => moveItemIndexBy(handlerInput, -1),
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

    return moveItemIndexBy(handlerInput, 1);
  },
};
