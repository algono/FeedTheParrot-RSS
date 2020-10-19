import { RequestHandler, getRequestType } from 'ask-sdk-core';
import { dialog } from 'ask-sdk-model';

export const SessionEndedRequestHandler: RequestHandler = {
  canHandle(handlerInput) {
    return (
      getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest'
    );
  },
  handle(handlerInput) {
    // Any cleanup logic goes here.

    // Clearing dynamic entities at session end (this is a best practice)
    const clearEntitiesDirective: dialog.DynamicEntitiesDirective = {
      type: 'Dialog.UpdateDynamicEntities',
      updateBehavior: 'CLEAR',
    };

    return handlerInput.responseBuilder
      .addDirective(clearEntitiesDirective)
      .getResponse();
  },
};
