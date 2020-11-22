import { RequestHandler, getRequestType } from 'ask-sdk-core';
import { dialog } from 'ask-sdk-model';
import { Database } from '../database/Database';
import { NoUserDataError } from '../logic/Errors';

import { TFunction } from '../util/localization';

export interface LaunchSessionAttributes {
  nameField: string;
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

    const nameField: string = t('FEED_NAME_FIELD');

    const sessionAttributes: LaunchSessionAttributes = { nameField };

    attributesManager.setSessionAttributes(sessionAttributes);

    console.log('(LaunchRequest) Retrieving user data from database');

    try {
      const userData = await Database.use(attributesManager).getUserData();

      const feedNames = userData.feedNames;

      console.log('(LaunchRequest) Feed names: ' + JSON.stringify(feedNames));

      // Use the map function to have the names in the correct format (as slot values)
      const feedNamesAsSlotValues = feedNames.map((value) => ({
        name: {
          value: value,
        },
      }));

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
