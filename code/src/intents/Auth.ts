import { RequestHandler, getRequestType, getIntentName } from 'ask-sdk-core';

import { randomBytes } from 'crypto';
import { Database } from '../database/Database';

import { LONG_PAUSE } from '../util/constants';
import { TFunction } from '../util/localization';

export const AuthIntentHandler: RequestHandler = {
  canHandle(handlerInput) {
    return (
      getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      getIntentName(handlerInput.requestEnvelope) === 'AuthIntent'
    );
  },
  async handle(handlerInput) {
    const {
      t,
    }: {
      t?: TFunction;
    } = handlerInput.attributesManager.getRequestAttributes();

    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const code = generateSixDigitCode();

    console.log('(AuthIntent) Generated code: ' + JSON.stringify(code));

    const TIME_TO_EXPIRE = 10 * 60 * 1000; // 10 minutes in milliseconds

    await Database.instance.addAuthCode({
      uid: sessionAttributes.userIdDB,
      code: code,
      expirationDate: new Date(Date.now() + TIME_TO_EXPIRE),
    });

    const speakOutput: string = `${t('AUTH_PRE_CODE_MSG')} ${code
      .split('')
      .join(LONG_PAUSE)}. ${t('AUTH_EXPLANATION_MSG')} ${t('REPROMPT_MSG')}`;

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  },
};

function generateSixDigitCode() {
  return (parseInt(randomBytes(4).toString('hex'), 16) % 1000000)
    .toString()
    .padStart(6, '0');
}
