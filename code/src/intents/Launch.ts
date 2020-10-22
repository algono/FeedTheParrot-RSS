import { RequestHandler, getRequestType, getUserId } from 'ask-sdk-core';
import { dialog } from 'ask-sdk-model';
import { Database } from '../database/Database';

import { Feed } from '../logic/Feed';

export const LaunchRequestHandler: RequestHandler = {
  canHandle(handlerInput) {
    return getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  async handle(handlerInput) {
    const { attributesManager, responseBuilder } = handlerInput;
    const requestAttributes = attributesManager.getRequestAttributes();
    const { t } = requestAttributes;

    const speakOutput: string = t('WELCOME_MSG');

    const sessionAttributes = attributesManager.getSessionAttributes() || {};

    console.log(
      '(LaunchRequest) Session Attributes: ' + JSON.stringify(sessionAttributes)
    );

    let feeds: { [x: string]: Feed }, feedNames: string[];
    if (!(sessionAttributes.feeds && sessionAttributes.feedNames)) {
      console.log('(LaunchRequest) Retrieving feeds data from database');

      const userId = getUserId(handlerInput.requestEnvelope);

      const {userDataRef} = await Database.getUserData(userId);

      // Get ID from database and store it in session attributes
      const userIdDB = userDataRef.id;
      sessionAttributes.userIdDB = userIdDB;

      console.log('(LaunchRequest) User ID: ' + userIdDB);

      const nameField: string = t('FEED_NAME_FIELD');
      const feedsAndFeedNames = await Database.getFeedsFromUser(userDataRef, nameField);

      feeds = feedsAndFeedNames.feeds;
      feedNames = feedsAndFeedNames.feedNames;

      sessionAttributes.feeds = feeds;
      sessionAttributes.feedNames = feedNames;

      attributesManager.setSessionAttributes(sessionAttributes);
    } else {
      console.log(
        '(LaunchRequest) Feeds data was already in session attributes'
      );
      feeds = sessionAttributes.feeds;
      feedNames = sessionAttributes.feedNames;
    }

    console.log('(LaunchRequest) Feed names: ' + JSON.stringify(feedNames));
    console.log('(LaunchRequest) Feeds (data): ' + JSON.stringify(feeds));

    // Use the map function to have the names in the correct format (as slot values)
    const feedNamesAsSlotValues = feedNames.map((value) => {
      return {
        name: {
          value: value,
        },
      };
    });

    console.log(
      '(LaunchRequest) Feed names (as slot values): ' +
        JSON.stringify(feedNamesAsSlotValues)
    );

    // Add the user's feed names
    const replaceEntityDirective: dialog.DynamicEntitiesDirective = {
      type: 'Dialog.UpdateDynamicEntities',
      updateBehavior: 'REPLACE',
      types: [
        {
          name: 'FeedName',
          values: feedNamesAsSlotValues,
        },
      ],
    };

    return responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .addDirective(replaceEntityDirective)
      .getResponse();
  },
};
