import { RequestHandler, getRequestType, getUserId } from 'ask-sdk-core';
import { dialog } from 'ask-sdk-model';
import { Database } from '../database/Database';
import { NoUserDataError } from '../logic/Errors';

import { Feed } from '../logic/Feed';
import { TFunction } from '../util/localization';

export interface LaunchSessionAttributes {
  feeds?: { [x: string]: Feed };
  feedNames?: string[];
  userIdDB?: string;
}

export const LaunchRequestHandler: RequestHandler = {
  canHandle(handlerInput) {
    return getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  async handle(handlerInput) {
    const { attributesManager, responseBuilder } = handlerInput;
    const requestAttributes = attributesManager.getRequestAttributes();
    const { t }: { t?: TFunction } = requestAttributes;

    const speakOutput: string = t('WELCOME_MSG');

    const sessionAttributes: LaunchSessionAttributes = {};

    console.log('(LaunchRequest) Retrieving user data from database');

    const userId = getUserId(handlerInput.requestEnvelope);

    try {
      const { userDataRef } = await Database.instance.getUserData(userId);

      // Get ID from database and store it in session attributes
      const userIdDB = userDataRef.id;
      sessionAttributes.userIdDB = userIdDB;

      console.log('(LaunchRequest) User ID: ' + userIdDB);
      console.log('(LaunchRequest) Retrieving feed data from database');

      const nameField: string = t('FEED_NAME_FIELD');
      const feedsAndFeedNames = await Database.instance.getFeedsFromUser(
        userDataRef,
        nameField
      );

      const feeds = feedsAndFeedNames.feeds;
      const feedNames = feedsAndFeedNames.feedNames;

      sessionAttributes.feeds = feeds;
      sessionAttributes.feedNames = feedNames;

      attributesManager.setSessionAttributes(sessionAttributes);

      console.log('(LaunchRequest) Feed names: ' + JSON.stringify(feedNames));

      // Use the map function to have the names in the correct format (as slot values)
      const feedNamesAsSlotValues = feedNames.map((value) => ({
        name: {
          value: value,
        },
      }));

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

      responseBuilder.addDirective(replaceEntityDirective);
    } catch (err) {
      if (err instanceof NoUserDataError) {
        console.log('(Database) No user data. Launching without credentials');
      } else {
        throw err;
      }
    }

    return responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  },
};
