import { RequestHandler, getRequestType, getIntentName } from "ask-sdk-core";

import { randomBytes } from 'crypto';

import * as firebaseAdmin from 'firebase-admin';

const DB = firebaseAdmin.firestore();

export const AuthIntentHandler : RequestHandler = {
    canHandle(handlerInput) {
        return getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && getIntentName(handlerInput.requestEnvelope) === 'AuthIntent';
    },
    async handle(handlerInput) {
        const requestAttributes = handlerInput.attributesManager.getRequestAttributes();

        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        const code = generateSixDigitCode();

        console.log('(AuthIntent) Generated code: ' + JSON.stringify(code));

        const TIME_TO_EXPIRE = 10 * 60 * 1000; // 10 minutes in milliseconds

        await DB.collection('auth-codes').add({
            uid: sessionAttributes.userIdDB,
            code: code,
            expirationDate: new Date(Date.now() + TIME_TO_EXPIRE)
        })
        
        const speakOutput: string = requestAttributes.t('AUTH_MSG') + `<say-as interpret-as="digits">${code}</say-as>`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    },
};

function generateSixDigitCode() {
    return (parseInt(randomBytes(4).toString('hex'), 16) % 1000000).toString().padStart(6, '0');
}