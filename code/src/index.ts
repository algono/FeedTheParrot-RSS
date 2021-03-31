import { SkillBuilders } from 'ask-sdk-core';
import { LocalizationRequestInterceptor } from './util/localization';

// Intents

import { LaunchRequestHandler } from './intents/Launch';
import { AuthIntentHandler } from './intents/Auth';
import { ListIntentHandler } from './intents/List';

import { ReadIntentHandler } from './intents/Read/Fetch';

import {
  ReadItemIntentHandler,
  ReadContentIntentHandler,
  GoToPreviousItemIntentHandler,
  SkipItemIntentHandler,
} from './intents/Read/Item';

import { HelpIntentHandler } from './intents/Help';
import { CancelAndStopIntentHandler } from './intents/Stop';
import { IntentReflectorHandler } from './intents/Reflector';
import { SessionEndedRequestHandler } from './intents/SessionEnded';
import {
  RepeatIntentHandler,
  SaveResponseForRepeatingInterceptor,
} from './intents/Repeat';
import {
  FeedIsTooLongErrorHandler,
  GenericErrorHandler,
  InvalidFeedUrlErrorHandler,
} from './intents/Error';
import { FirebaseWithDynamoDbPersistenceAdapter } from './database/FirebaseWithDynamoDbPersistenceAdapter';

// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
export const handler = SkillBuilders.custom()
  .withSkillId('amzn1.ask.skill.ad75c16d-e3d6-4e9e-ba98-43ec1843b3d6')
  .addRequestHandlers(
    LaunchRequestHandler,
    CancelAndStopIntentHandler,
    HelpIntentHandler,
    AuthIntentHandler,
    ReadIntentHandler,
    ReadItemIntentHandler,
    ReadContentIntentHandler,
    GoToPreviousItemIntentHandler,
    SkipItemIntentHandler,
    ListIntentHandler,
    SessionEndedRequestHandler,
    RepeatIntentHandler, // make sure RepeatIntentHandler is after ReadItemIntentHandler so it doesn't override its repeating functionality
    IntentReflectorHandler // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
  )
  .addRequestInterceptors(LocalizationRequestInterceptor)
  .addResponseInterceptors(SaveResponseForRepeatingInterceptor)
  .addErrorHandlers(
    InvalidFeedUrlErrorHandler,
    FeedIsTooLongErrorHandler,
    GenericErrorHandler
  )
  .withPersistenceAdapter(new FirebaseWithDynamoDbPersistenceAdapter())
  .lambda();
