import { ErrorHandler, SkillBuilders, } from 'ask-sdk-core';
import * as localization from './util/localization';

// Database init

import * as firebaseAdmin from 'firebase-admin';
import * as firebaseCredentials from './firebaseServiceAccountKey.json';

firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(firebaseCredentials as firebaseAdmin.ServiceAccount),
    databaseURL: "https://feedtheparrot-rss.firebaseio.com"
});

// Intents

import { LaunchRequestHandler } from "./intents/Launch";
import { AuthIntentHandler } from "./intents/Auth";
import { ListIntentHandler } from "./intents/List";

import { 
    ReadIntentHandler,
    ReadItemIntentHandler,
    ReadContentIntentHandler,
    GoToPreviousItemIntentHandler,
    SkipItemIntentHandler
} from "./intents/Read";

import { HelpIntentHandler } from "./intents/Help";
import { CancelAndStopIntentHandler } from "./intents/Stop";
import { IntentReflectorHandler } from "./intents/Reflector";
import { SessionEndedRequestHandler } from "./intents/SessionEnded";
import { RepeatIntentHandler, SaveResponseForRepeatingInterceptor } from './intents/Repeat';

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const GenericErrorHandler : ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`~~~~ Error handled: ${error.stack}`);

        // It turns out that the error handler doesn't call the localization interceptor
        // And the ReadIntent may change the localization language
        // So we have to call it again manually to ensure that the language is correctly set
        localization.localizationRequestInterceptor.process(handlerInput);

        const requestAttributes = handlerInput.attributesManager.getRequestAttributes();

        const speakOutput: string = requestAttributes.t('ERROR_MSG');

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = SkillBuilders.custom()
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
        IntentReflectorHandler, // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
    )
    .addRequestInterceptors(
        localization.localizationRequestInterceptor,
    )
    .addResponseInterceptors(
        SaveResponseForRepeatingInterceptor,
    )
    .addErrorHandlers(
        GenericErrorHandler,
    )
    .lambda();
