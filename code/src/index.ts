import { SkillBuilders } from 'ask-sdk-core';
import { localizationRequestInterceptor } from './util/localization';

// Intents

import { LaunchRequestHandler } from './intents/Launch';
import { AuthIntentHandler } from './intents/Auth';
import { ListIntentHandler } from './intents/List';

import {
  ReadIntentHandler,
  ReadItemIntentHandler,
  ReadContentIntentHandler,
  GoToPreviousItemIntentHandler,
  SkipItemIntentHandler,
} from './intents/Read';

import { HelpIntentHandler } from './intents/Help';
import { CancelAndStopIntentHandler } from './intents/Stop';
import { IntentReflectorHandler } from './intents/Reflector';
import { SessionEndedRequestHandler } from './intents/SessionEnded';
import {
  RepeatIntentHandler,
  SaveResponseForRepeatingInterceptor,
} from './intents/Repeat';
import { GenericErrorHandler } from './intents/Error';

// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
export const handler = SkillBuilders.custom()
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
  .addRequestInterceptors(localizationRequestInterceptor)
  .addResponseInterceptors(SaveResponseForRepeatingInterceptor)
  .addErrorHandlers(GenericErrorHandler)
  .lambda();
